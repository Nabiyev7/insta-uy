import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, test } from 'vitest';
import { hasBannedWord } from '../../packages/shared/src/index.ts';
import { openDb, rpc } from '../../server/dev/db.ts';

let db: PGlite;
let n = 0;
type Row = Record<string, unknown>;

const anon = (fn: string, args: Row = {}): Promise<unknown> => rpc(db, 'anon', null, fn, args);
const as = (uid: string, fn: string, args: Row = {}): Promise<unknown> => rpc(db, 'authenticated', uid, fn, args);
const svc = (fn: string, args: Row = {}): Promise<unknown> => rpc(db, 'service_role', null, fn, args);
const sql = async (q: string, p: unknown[] = []): Promise<Row[]> => (await db.query<Row>(q, p)).rows;
const set = (key: string, v: unknown): Promise<Row[]> => sql('update settings set value = $2::jsonb where key = $1', [key, JSON.stringify(v)]);

const user = async (ref?: string): Promise<string> => {
  const id = randomUUID();
  await svc('svc_profile_create', { p_user: id, p_login: `user${++n}`, p_ref: ref ?? null });
  return id;
};
const admin = async (): Promise<string> => {
  const id = await user();
  await sql("update profiles set role = 'admin' where user_id = $1", [id]);
  return id;
};
const freePlot = async (district = 1, type = 'hovli'): Promise<string> =>
  (await sql("select id from plots p where district_id = $1 and type = $2 and not exists (select 1 from plot_state s where s.plot_id = p.id) order by id limit 1", [district, type]))[0]!.id as string;
const owner = async (): Promise<{ uid: string; plot: string }> => {
  const uid = await user();
  const plot = await freePlot();
  await as(uid, 'my_claim', { p_plot: plot, p_instagram: `nick${n}` });
  await sql("update plot_state set status = 'owned' where plot_id = $1", [plot]);
  return { uid, plot };
};

beforeAll(async () => { db = await openDb(); });

describe('ruxsatlar', () => {
  test('anon jadvalga, my_*, admin_*, svc_* ga kira olmaydi', async () => {
    await expect(db.transaction(async (tx) => { await tx.exec('set local role anon'); await tx.query('select * from public.profiles'); })).rejects.toThrow(/permission denied/);
    for (const fn of ['my_profile', 'admin_stats', 'svc_backup', 'svc_tick']) await expect(anon(fn)).rejects.toThrow(/permission denied/);
    const u = await user();
    await expect(as(u, 'svc_backup')).rejects.toThrow(/permission denied/);
    await expect(as(u, 'admin_stats')).rejects.toThrow('forbidden');
    await expect(as(u, 'admin_setting', { p_key: 'maintenance', p_value: true })).rejects.toThrow('forbidden');
  });

  test('hamma jadvalda RLS yoqilgan, hamma ochiq funksiya nom qoidasiga mos', async () => {
    expect(await sql("select relname from pg_class c join pg_namespace s on s.oid = c.relnamespace where s.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity")).toEqual([]);
    expect(await sql("select proname from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and proname !~ '^(api|my|admin|svc)_'")).toEqual([]);
    expect(await sql("select proname from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.prosecdef and not coalesce(array_to_string(p.proconfig, ','), '') like '%search_path=%'")).toEqual([]);
    const open = await sql("select proname from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute') and proname !~ '^api_'");
    expect(open).toEqual([]);
  });

  test('bloklangan foydalanuvchi va texnik ishlar rejimi', async () => {
    const u = await user();
    await set('maintenance', true);
    await expect(as(u, 'my_claim', { p_plot: 'P0001', p_instagram: 'x_y' })).rejects.toThrow('maintenance');
    await set('maintenance', false);
    await sql('update profiles set is_banned = true where user_id = $1', [u]);
    await expect(as(u, 'my_profile')).rejects.toThrow('banned');
  });
});

describe('qulflangan bosh reja', () => {
  test.each([
    'update plots set x = 1 where id = \'P0001\'', 'delete from plots where id = \'P0001\'', 'truncate plots cascade', 'update streets set district_id = 3 where id = 1',
    'delete from streets where id = 1', "update expansions set x = 0 where id = 'E001'", "update commerce set x = 0 where id = 'B001'", 'update districts set zone = \'kol\' where id = 1',
  ])('rad etiladi: %s', async (q) => {
    await expect(db.exec(q)).rejects.toThrow('locked_master_plan');
  });
  test('ko‘rinish maydonlari o‘zgaradi', async () => {
    await db.exec("update districts set name_uz = 'Markaz mahallasi' where id = 1");
    expect((await sql('select count(*)::int c from plots'))[0]!.c).toBe(5000);
  });
});

describe('so‘z filtri SQL = TS', () => {
  test.each(['suka', 'СУКА', 's.u.k.a', 'suuuka', '$uka', 'j4lab', 'my_bitch', 'musiqa', 'sikka', 'kotib', 'amin', 'salom dunyo', 'a b c', 's u k a', "o'zbek", 'сика', 'ЁЖ'])('%s', async (t) => {
    expect((await sql('select private.has_banned($1) b', [t]))[0]!.b).toBe(hasBannedWord(t));
  });
});

describe('bepul uy', () => {
  test('olish, takror, band, yopiq tuman, pullik', async () => {
    const u = await user();
    const plot = await freePlot();
    expect(await as(u, 'my_claim', { p_plot: plot, p_instagram: '@Ali_01', p_bio: 'Salom' })).toMatchObject({ status: 'owned' });
    await expect(as(u, 'my_claim', { p_plot: await freePlot(), p_instagram: 'ali_02' })).rejects.toThrow('free_used');
    const u2 = await user();
    await expect(as(u2, 'my_claim', { p_plot: plot, p_instagram: 'vali_1' })).rejects.toThrow('not_free');
    await expect(as(u2, 'my_claim', { p_plot: await freePlot(), p_instagram: 'ALI_01' })).rejects.toThrow('nick_taken');
    await expect(as(u2, 'my_claim', { p_plot: await freePlot(5), p_instagram: 'vali_1' })).rejects.toThrow('district_closed');
    await expect(as(u2, 'my_claim', { p_plot: await freePlot(10, 'villa'), p_instagram: 'vali_1' })).rejects.toThrow('paid_only');
    await expect(as(u2, 'my_claim', { p_plot: await freePlot(), p_instagram: 'suka_1' })).rejects.toThrow('banned_word');
    await expect(as(u2, 'my_claim', { p_plot: await freePlot(), p_instagram: 'vali_1', p_bio: 'www.spam.uz' })).rejects.toThrow('bad_format');
    await expect(as(u2, 'my_claim', { p_plot: 'P9999', p_instagram: 'vali_1' })).rejects.toThrow('not_found');
    const p = (await as(u, 'my_profile')) as { badges: string[]; plots: Row[] };
    expect(p.badges).toContain('asoschi');
    expect(p.plots).toHaveLength(1);
    expect(await anon('api_search', { p_q: 'ali_' })).toMatchObject([{ instagram: 'ali_01', plot }]);
    expect(await anon('api_search', { p_q: '%' })).toEqual([]);
  });

  test('nik tasdig‘i yo‘q: uy darhol egali; admin bo‘shatsa bepul huquq qaytadi', async () => {
    const a = await admin();
    const u = await user();
    const plot = await freePlot();
    await as(u, 'my_claim', { p_plot: plot, p_instagram: 'rad_1' });
    expect(await anon('api_plot', { p_plot: plot })).toMatchObject({ status: 'owned', instagram: 'rad_1' });
    for (const action of ['approve', 'reject']) await expect(as(a, 'admin_plot', { p_plot: plot, p_action: action })).rejects.toThrow('bad_format');
    await as(a, 'admin_plot', { p_plot: plot, p_action: 'release' });
    expect(await anon('api_plot', { p_plot: plot })).toMatchObject({ status: 'free' });
    await as(u, 'my_claim', { p_plot: plot, p_instagram: 'rad_1' });
    expect((await sql("select value from settings where key = 'require_approval'"))).toEqual([]);
    const city = (await anon('api_city', { p_districts: [1] })) as unknown[][];
    expect(city.find((r) => r[0] === plot)?.[8]).toBe('owned');
    expect(await anon('api_city', { p_districts: [7] })).toEqual([]);
  });

  test('taklif qilgan odam tanga oladi', async () => {
    const inviter = await user();
    const ref = (await sql('select ref_code from profiles where user_id = $1', [inviter]))[0]!.ref_code as string;
    const guest = await user(ref);
    const plot = await freePlot();
    await as(guest, 'my_claim', { p_plot: plot, p_instagram: 'mehmon_1' });
    expect(await as(inviter, 'my_profile')).toMatchObject({ coins: 50, invited: 1 });
  });
});

describe('uy bezash va sovg‘a', () => {
  test('faqat o‘z uyi va o‘z bezagi', async () => {
    const { uid, plot } = await owner();
    const other = await owner();
    await as(uid, 'my_edit_bio', { p_plot: plot, p_bio: 'Yangi' });
    expect(await anon('api_plot', { p_plot: plot })).toMatchObject({ bio: 'Yangi' });
    await expect(as(other.uid, 'my_edit_bio', { p_plot: plot, p_bio: 'x' })).rejects.toThrow('not_owner');
    await expect(as(uid, 'my_edit_bio', { p_plot: plot, p_bio: 't.me/reklama' })).rejects.toThrow('bad_format');
    // Rang tanlash yo'q: eski funksiya olib tashlangan.
    await expect(as(uid, 'my_edit_house', { p_plot: plot, p_bio: '', p_wall: 3, p_roof: 2 })).rejects.toThrow(/my_edit_house/);
    await expect(as(uid, 'my_place_decor', { p_plot: plot, p_places: { sign: 'sign_nick' } })).rejects.toThrow('not_owned');
    await sql('update profiles set coins = 1000 where user_id = $1', [uid]);
    expect(await as(uid, 'my_buy_decor_coins', { p_id: 'sign_nick' })).toBe(900);
    await as(uid, 'my_place_decor', { p_plot: plot, p_places: { sign: 'sign_nick' } });
    for (const id of ['gate_wood', 'tree_anor', 'daraxt_olma', 'avto_sedan']) await expect(as(uid, 'my_buy_decor_coins', { p_id: id })).rejects.toThrow('level_low');
    await sql('update profiles set coins = 350 where user_id = $1', [uid]);
    await sql('update plot_state set tier = 5 where plot_id = $1', [plot]);
    await expect(as(uid, 'my_buy_decor_coins', { p_id: 'special_statue' })).rejects.toThrow('not_enough_coins');
    await sql('update plot_state set tier = 1 where plot_id = $1', [plot]);
    // Kuchaytirish narxi: 2-level 300, 3-level 1 000 (docs/chat/TANGA-NARXLAR.md).
    expect(await as(uid, 'my_tier_coins', { p_plot: plot })).toBe(50);
    expect(await as(uid, 'my_tier_coins', { p_plot: plot }).catch((e: Error) => e.message)).toBe('not_enough_coins');
    await sql('update profiles set coins = 6500 where user_id = $1', [uid]);
    for (const left of [5500, 3500, 0]) expect(await as(uid, 'my_tier_coins', { p_plot: plot })).toBe(left);
    await expect(as(uid, 'my_tier_coins', { p_plot: plot })).rejects.toThrow('max_tier');
    await expect(sql('update plot_state set tier = 6 where plot_id = $1', [plot])).rejects.toThrow(/tier_check/);
  });

  test('noyob bezak soni cheklangan', async () => {
    const { uid } = await owner();
    await sql('update profiles set coins = 100000 where user_id = $1', [uid]);
    await sql("update decor_catalog set stock = 1, sold = 0 where id = 'special_peacock'");
    await sql('update plot_state set tier = 5 where owner = $1', [uid]);
    await as(uid, 'my_buy_decor_coins', { p_id: 'special_peacock' });
    await expect(as(uid, 'my_buy_decor_coins', { p_id: 'special_peacock' })).rejects.toThrow('sold_out');
    expect(await as(uid, 'my_profile')).toMatchObject({ coins: 96000 });
  });

  test('sovg‘a: taklif → qabul, egasi almashadi', async () => {
    const { uid, plot } = await owner();
    const to = await user();
    const login = (await sql('select login from profiles where user_id = $1', [to]))[0]!.login;
    const id = await as(uid, 'my_transfer', { p_plot: plot, p_to: login, p_message: 'Tabriklayman' });
    await expect(as(uid, 'my_transfer_answer', { p_id: id, p_accept: true })).rejects.toThrow('not_found');
    await as(to, 'my_transfer_answer', { p_id: id, p_accept: true, p_instagram: 'sovga_nik' });
    expect(await anon('api_plot', { p_plot: plot })).toMatchObject({ instagram: 'sovga_nik' });
    await expect(as(uid, 'my_edit_bio', { p_plot: plot, p_bio: '' })).rejects.toThrow('not_owner');
    expect(await as(uid, 'my_profile')).toMatchObject({ free_used: true });
  });
});

describe('buyurtma va to‘lov', () => {
  test('o‘chirilgan bo‘lsa ishlamaydi; noyob summa; idempotent to‘lov', async () => {
    const u = await user();
    const plot = await freePlot();
    await expect(as(u, 'my_order', { p_kind: 'plot', p_payload: { plot, instagram: 'boy_1' } })).rejects.toThrow('payments_off');
    await set('payments_enabled', true);
    const o = (await as(u, 'my_order', { p_kind: 'plot', p_payload: { plot, instagram: 'boy_1', amount: 1 } })) as { id: string; amount: number };
    const price = (await sql('select private.plot_price($1) p', [plot]))[0]!.p as number;
    expect(o.amount).toBeGreaterThan(price);
    expect(o.amount).toBeLessThan(price + 1000);
    const u2 = await user();
    await expect(as(u2, 'my_claim', { p_plot: plot, p_instagram: 'tez_1' })).rejects.toThrow('not_free');
    expect(await svc('svc_payment', { p_provider: 'card', p_external: 'tx1', p_amount: 777 })).toMatchObject({ result: 'unmatched' });
    expect(await svc('svc_payment', { p_provider: 'card', p_external: 'tx2', p_amount: o.amount })).toMatchObject({ result: 'paid', order: o.id });
    expect(await svc('svc_payment', { p_provider: 'card', p_external: 'tx2', p_amount: o.amount })).toEqual({ result: 'duplicate' });
    expect(await anon('api_plot', { p_plot: plot })).toMatchObject({ status: 'owned', instagram: 'boy_1' });
  });

  test('muddati o‘tgach kelgan to‘lov: joy bo‘sh bo‘lsa beriladi, band bo‘lsa adminga', async () => {
    const late = await user();
    const plot = await freePlot();
    const o = (await as(late, 'my_order', { p_kind: 'plot', p_payload: { plot, instagram: 'kech_1' } })) as { id: string; amount: number };
    await sql("update orders set expires_at = now() - interval '1 minute' where id = $1", [o.id]);
    await sql("update plot_state set reserved_until = now() - interval '1 minute' where plot_id = $1", [plot]);
    await svc('svc_tick');
    const fast = await user();
    await as(fast, 'my_claim', { p_plot: plot, p_instagram: 'tezkor_1' });
    expect(await svc('svc_payment', { p_provider: 'card', p_external: 'late', p_amount: o.amount })).toMatchObject({ result: 'needs_review' });
    expect(await anon('api_plot', { p_plot: plot })).toMatchObject({ instagram: 'tezkor_1' });
    const a = await admin();
    const q = (await as(a, 'admin_orders')) as { payments: Row[]; orders: Row[] };
    expect(q.payments.some((p) => p.status === 'needs_review')).toBe(true);
    expect(q.orders.find((x) => x.id === o.id)).toMatchObject({ status: 'failed' });
  });

  test('daraja, yorliq, kengaytirish, bezak, ko‘cha nomi, bilbord', async () => {
    const { uid, plot } = await owner();
    const a = await admin();
    const pay = async (kind: string, payload: Row): Promise<unknown> => {
      const o = (await as(uid, 'my_order', { p_kind: kind, p_payload: payload })) as { id: string };
      return as(a, 'admin_order', { p_id: o.id, p_action: 'paid' });
    };
    expect(await as(uid, 'my_quote', { p_kind: 'tier', p_payload: { plot, tier: 3 } })).toBe(40000);
    await expect(as(uid, 'my_quote', { p_kind: 'tier', p_payload: { plot, tier: 11 } })).rejects.toThrow('bad_format');
    await expect(as(uid, 'my_quote', { p_kind: 'tier', p_payload: { plot, tier: 6 } })).rejects.toThrow('bad_format');
    expect(await as(uid, 'my_quote', { p_kind: 'tier', p_payload: { plot, tier: 5 } })).toBe(110000);
    expect(await pay('tier', { plot, tier: 3 })).toBe('paid');
    await expect(as(uid, 'my_order', { p_kind: 'tier', p_payload: { plot, tier: 2 } })).rejects.toThrow('bad_format');
    expect(await pay('label', { plot, label: 'gold' })).toBe('paid');
    await expect(as(uid, 'my_quote', { p_kind: 'decor', p_payload: { id: 'avto_sedan' } })).rejects.toThrow('level_low');
    expect(await pay('tier', { plot, tier: 5 })).toBe('paid');
    expect(await pay('decor', { id: 'avto_sedan' })).toBe('paid');
    expect(await pay('street_name', { street: 1, name: "Bog'ishamol" })).toBe('paid');
    await as(a, 'admin_street', { p_id: 1, p_approve: true });
    expect(await anon('api_boot')).toMatchObject({ streets: { 1: "Bog'ishamol" } });
    expect(((await as(a, 'admin_videos')) as Row[])[0]).toMatchObject({ kind: 'street', status: 'queued' });
    const bb = (await sql("select id from commerce where type = 'bilbord' limit 1"))[0]!.id as string;
    await expect(as(uid, 'my_order', { p_kind: 'commerce', p_payload: { id: bb } })).rejects.toThrow('not_for_sale');
    await set('commerce_closed', []);
    expect(await pay('commerce', { id: bb })).toBe('paid');
    await expect(as(uid, 'my_commerce_edit', { p_id: bb, p_title: 'Reklama', p_link: 'javascript:alert(1)', p_image: '' })).rejects.toThrow('bad_format');
    await expect(as(uid, 'my_commerce_edit', { p_id: bb, p_title: 'Reklama', p_link: '', p_image: `ads/${randomUUID()}/aaaaaaaa.webp` })).rejects.toThrow('bad_format');
    await as(uid, 'my_commerce_edit', { p_id: bb, p_title: 'Reklama', p_link: 'https://misol.uz/x', p_image: `ads/${uid}/aaaaaaaa-1.webp` });
    expect(((await anon('api_boot')) as { commerce: Row[] }).commerce).toEqual([]);
    await as(a, 'admin_ad', { p_id: bb, p_approve: true });
    expect(((await anon('api_boot')) as { commerce: Row[] }).commerce).toMatchObject([{ id: bb, title: 'Reklama' }]);
    expect((await as(uid, 'my_orders') as Row[]).length).toBe(6);
    expect(await as(uid, 'my_profile')).toMatchObject({ badges: expect.arrayContaining(['asoschi']) });
  });

  test('qarovsiz 3 tadan ortiq ochiq buyurtma mumkin emas, bekor qilinsa joy bo‘shaydi', async () => {
    const u = await user();
    const plots = [await freePlot()];
    const first = ((await as(u, 'my_order', { p_kind: 'plot', p_payload: { plot: plots[0], instagram: 'kop_1' } })) as { id: string }).id;
    for (const id of ['sign_nick', 'sign_nick']) await as(u, 'my_order', { p_kind: 'decor', p_payload: { id } });
    await expect(as(u, 'my_order', { p_kind: 'decor', p_payload: { id: 'sign_nick' } })).rejects.toThrow('too_many_orders');
    await as(u, 'my_order_cancel', { p_id: first });
    expect(await anon('api_plot', { p_plot: plots[0] })).toMatchObject({ status: 'free' });
    await set('payments_enabled', false);
  });
});

describe('ko‘cha nomi', () => {
  test('birinchi ega vaqtincha nom, 5 ega bo‘lsa ovoz, g‘olib tasdiqqa', async () => {
    const a = await admin();
    const plots = (await sql("select id, street_id from plots p where district_id = 1 and street_id = (select street_id from plots where district_id = 1 and street_id not in (select id from streets where is_central) group by street_id having count(*) >= 12 order by street_id limit 1) and not exists (select 1 from plot_state s where s.plot_id = p.id) order by id limit 5")) as { id: string; street_id: number }[];
    const street = plots[0]!.street_id;
    const us: string[] = [];
    for (const p of plots) {
      const u = await user();
      us.push(u);
      await as(u, 'my_claim', { p_plot: p.id, p_instagram: `kocha_${n}` });
    }
    await sql("update plot_state set claimed_at = claimed_at - interval '1 hour' where plot_id = $1", [plots[0]!.id]);
    const firstOwner = (await sql('select st.owner from plot_state st join plots p on p.id = st.plot_id where p.street_id = $1 order by st.claimed_at limit 1', [street]))[0]!.owner as string;
    if (firstOwner !== us[0]) return;
    await expect(as(us[1]!, 'my_street_temp', { p_street: street, p_name: 'Gulzor' })).rejects.toThrow('not_first_owner');
    await as(us[0]!, 'my_street_temp', { p_street: street, p_name: 'Gulzor' });
    await as(a, 'admin_street', { p_id: street, p_approve: true });
    const stranger = await user();
    await expect(as(stranger, 'my_street_open_vote', { p_street: street })).rejects.toThrow('not_resident');
    const vote = await as(us[0]!, 'my_street_open_vote', { p_street: street });
    await as(us[0]!, 'my_street_propose', { p_vote: vote, p_name: 'Navruz' });
    await as(us[1]!, 'my_street_propose', { p_vote: vote, p_name: 'Bahor' });
    await expect(as(us[1]!, 'my_street_propose', { p_vote: vote, p_name: 'Yoz' })).rejects.toThrow('already_proposed');
    await expect(as(us[2]!, 'my_street_propose', { p_vote: vote, p_name: 'a'.repeat(26) })).rejects.toThrow('too_long');
    const info = (await as(us[2]!, 'api_street', { p_street: street })) as { vote: { proposals: { id: number; name: string }[] } };
    const bahor = info.vote.proposals.find((p) => p.name === 'Bahor')!.id;
    await as(us[2]!, 'my_street_vote', { p_proposal: bahor });
    await as(us[3]!, 'my_street_vote', { p_proposal: bahor });
    await sql("update street_votes set closes_at = now() - interval '1 second' where id = $1", [vote]);
    await svc('svc_tick');
    await as(a, 'admin_street', { p_id: street, p_approve: true });
    expect(((await anon('api_boot')) as { streets: Row }).streets[street]).toBe('Bahor');
    await expect(as(us[0]!, 'my_street_open_vote', { p_street: street })).rejects.toThrow('vote_once_a_year');
  });
});

describe('tanga iqtisodi', () => {
  test('kunlik bonus bir marta, topshiriq serverda tekshiriladi', async () => {
    const { uid } = await owner();
    expect(await as(uid, 'my_daily')).toMatchObject({ gain: 10, streak: 1 });
    await expect(as(uid, 'my_daily')).rejects.toThrow('already_claimed');
    await sql('update profiles set last_daily = current_date - 1 where user_id = $1', [uid]);
    expect(await as(uid, 'my_daily')).toMatchObject({ gain: 15, streak: 2 });
    await expect(as(uid, 'my_quest_claim', { p_quest: 'telegram' })).rejects.toThrow('quest_not_ready');
    await as(uid, 'my_quest_claim', { p_quest: 'house' });
    await expect(as(uid, 'my_quest_claim', { p_quest: 'house' })).rejects.toThrow('already_claimed');
    for (const d of [1, 2, 3]) await as(uid, 'my_ping', { p_district: d });
    await as(uid, 'my_quest_claim', { p_quest: 'walk' });
    expect((await as(uid, 'my_quests') as Row[]).length).toBe(7);
  });

  test('umumiy loyiha: maqsaddan oshmaydi', async () => {
    const { uid } = await owner();
    await sql('update profiles set coins = 9000 where user_id = $1', [uid]);
    await expect(as(uid, 'my_contribute', { p_project: 1, p_amount: -5 })).rejects.toThrow('bad_format');
    expect(await as(uid, 'my_contribute', { p_project: 1, p_amount: 8000 })).toEqual({ coins: 4000, raised: 5000 });
    await expect(as(uid, 'my_contribute', { p_project: 1, p_amount: 10 })).rejects.toThrow('not_found');
    expect(((await anon('api_boot')) as { hero: Row }).hero).toMatchObject({ total: 5000 });
  });

  test('xazina: uzoqda iliq/sovuq, yaqinda topiladi, bir marta', async () => {
    const { uid } = await owner();
    expect(await as(uid, 'my_treasure', { p_x: 1500, p_z: 1500 })).toMatchObject({ state: 'hunt', heat: 'cold' });
    const t = (await sql('select x, z from treasures where day = current_date'))[0]!;
    expect(await as(uid, 'my_treasure', { p_x: t.x, p_z: t.z })).toMatchObject({ state: 'found', coins: 100 });
    expect(await as(uid, 'my_treasure', { p_x: t.x, p_z: t.z })).toEqual({ state: 'done' });
  });

  test('chastota chegarasi', async () => {
    const { uid } = await owner();
    const calls = Array.from({ length: 10 }, () => as(uid, 'my_treasure', { p_x: 0, p_z: 0 }).catch((e: Error) => e.message));
    const res: unknown[] = [];
    for (const c of calls) res.push(await c);
    expect(res.filter((r) => r === 'rate_limited').length).toBeGreaterThan(0);
  });
});

describe('saylov, gazeta, bo‘shatish', () => {
  test('hokim saylovi', async () => {
    await set('elections_enabled', true);
    await svc('svc_tick');
    const [a, b] = [await owner(), await owner()];
    const e = ((await anon('api_elections')) as { id: number; kind: string }[]).find((x) => x.kind === 'hokim')!;
    const outsider = await user();
    await expect(as(outsider, 'my_run', { p_election: e.id, p_slogan: 'Men' })).rejects.toThrow('not_resident');
    await as(a.uid, 'my_run', { p_election: e.id, p_slogan: "Yashil shahar" });
    await as(a.uid, 'my_vote', { p_election: e.id, p_candidate: a.uid });
    await as(b.uid, 'my_vote', { p_election: e.id, p_candidate: a.uid });
    await expect(as(b.uid, 'my_vote', { p_election: e.id, p_candidate: b.uid })).rejects.toThrow('not_found');
    await sql("update elections set ends_at = now() - interval '1 second' where id = $1", [e.id]);
    await svc('svc_tick');
    expect(await as(a.uid, 'my_profile')).toMatchObject({ badges: expect.arrayContaining(['hokim']) });
    expect(((await anon('api_gazette')) as Row[]).length).toBe(1);
  });

  test('faqat bepul, ogohlantirilgan, faol bo‘lmagan uy bo‘shaydi', async () => {
    const { uid, plot } = await owner();
    await set('release_inactive', true);
    await sql("update profiles set last_seen = now() - interval '200 days' where user_id = $1", [uid]);
    await svc('svc_tick');
    expect(await anon('api_plot', { p_plot: plot })).toMatchObject({ status: 'owned' });
    await sql("update notifications set created_at = now() - interval '15 days' where user_id = $1", [uid]);
    await sql("update plot_state set tier = 2 where plot_id = $1", [plot]);
    await svc('svc_tick');
    expect(await anon('api_plot', { p_plot: plot })).toMatchObject({ status: 'owned' });
    await sql("update plot_state set tier = 1 where plot_id = $1", [plot]);
    await svc('svc_tick');
    expect(await anon('api_plot', { p_plot: plot })).toMatchObject({ status: 'free' });
    await set('release_inactive', false);
  });

  test('reytinglar va katalog', async () => {
    const r = (await anon('api_rankings')) as { houses: Row[] };
    expect(r.houses.length).toBeGreaterThan(0);
    expect((await anon('api_catalog') as Row[]).length).toBeGreaterThan(20);
  });
});

describe('admin', () => {
  test('tumanlar faqat ketma-ket ochiladi', async () => {
    const a = await admin();
    await expect(as(a, 'admin_district', { p_id: 3, p_open: true })).rejects.toThrow('open_inner_first');
    await as(a, 'admin_district', { p_id: 2, p_open: true });
    await as(a, 'admin_district', { p_id: 2, p_open: false });
    await expect(as(a, 'admin_district', { p_id: 1, p_open: false })).rejects.toThrow('district_not_empty');
  });

  test('moderator faqat o‘z huquqi doirasida, o‘zini admin qila olmaydi', async () => {
    const a = await admin();
    const m = await user();
    await as(a, 'admin_user', { p_id: m, p_action: 'role', p_data: { role: 'moderator', perms: ['reports', 'users', 'hack'] } });
    expect(await as(m, 'admin_me')).toEqual({ login: expect.any(String), role: 'moderator', perms: ['reports', 'users'] });
    await expect(as(m, 'admin_orders')).rejects.toThrow('forbidden');
    await expect(as(m, 'admin_user', { p_id: m, p_action: 'role', p_data: { role: 'admin' } })).rejects.toThrow('forbidden');
    await expect(as(m, 'admin_user', { p_id: a, p_action: 'ban' })).rejects.toThrow('forbidden');
    const q = (await as(m, 'admin_queue')) as Row;
    expect(q).not.toHaveProperty('reports');
    expect(q.ads).toBeNull();
    // Shikoyat bo'limi yo'q.
    for (const fn of ['my_report', 'admin_report']) expect(await sql('select 1 from pg_proc where proname = $1', [fn])).toEqual([]);
    expect(await as(m, 'admin_stats')).toMatchObject({ revenue: null });
  });

  test('sozlama turi saqlanadi', async () => {
    const a = await admin();
    await expect(as(a, 'admin_setting', { p_key: 'maintenance', p_value: 'ha' })).rejects.toThrow('bad_format');
    await expect(as(a, 'admin_setting', { p_key: 'yoq', p_value: 1 })).rejects.toThrow('not_found');
    await as(a, 'admin_setting', { p_key: 'discount_pct', p_value: 10 });
    await as(a, 'admin_setting', { p_key: 'discount_pct', p_value: 0 });
    expect(await as(a, 'admin_settings')).toMatchObject({ discount_pct: 0 });
  });

  test('xarita muharriri: band joyga qo‘yilmaydi, nashr va orqaga qaytish', async () => {
    const a = await admin();
    const v1 = await as(a, 'admin_map_create', { p_name: 'v1' });
    const p = (await sql("select x, z from plots where id = 'P0001'"))[0]!;
    await expect(as(a, 'admin_map_save', { p_version: v1, p_objects: [{ m: 'bench', x: Number(p.x), z: Number(p.z), r: 0, s: 1 }] })).rejects.toThrow('spot_not_free');
    await as(a, 'admin_map_save', { p_version: v1, p_objects: [{ m: 'bench', x: 30, z: 30, r: 0, s: 1 }] });
    await as(a, 'admin_map_publish', { p_version: v1 });
    await expect(as(a, 'admin_map_save', { p_version: v1, p_objects: [] })).rejects.toThrow('not_draft');
    const v2 = await as(a, 'admin_map_create', { p_name: 'v2', p_from: v1 });
    await as(a, 'admin_map_publish', { p_version: v2 });
    await as(a, 'admin_map_publish', { p_version: v1 });
    expect(((await anon('api_boot')) as { objects: Row[] }).objects).toMatchObject([{ m: 'bench' }]);
    expect((await as(a, 'admin_map') as Row[]).filter((v) => v.status === 'published')).toHaveLength(1);
  });

  test('video navbati', async () => {
    const a = await admin();
    const id = await as(a, 'admin_video_create', { p_kind: 'houses', p_plots: ['P0001', 'P0002'], p_style: { title: 'Yangi uylar' } });
    await expect(as(a, 'admin_video_create', { p_kind: 'houses', p_plots: [], p_style: {} })).rejects.toThrow('bad_format');
    let job = (await svc('svc_video_next')) as Row;
    while (job.id !== id) job = (await svc('svc_video_next')) as Row;
    await svc('svc_video_done', { p_id: id, p_file: 'x.mp4' });
    await as(a, 'admin_video', { p_id: id, p_action: 'send' });
    expect(await svc('svc_video_sendable')).toMatchObject([{ id, file: 'x.mp4' }]);
    expect(await svc('svc_video_sendable')).toEqual([]);
  });
});

describe('xizmat funksiyalari', () => {
  test('telegram login bir martalik', async () => {
    const u = await user();
    await svc('svc_tg_begin', { p_hash: 'h1', p_purpose: 'link', p_user: u });
    expect(await svc('svc_tg_confirm', { p_hash: 'h1', p_telegram: 555, p_name: 'Ali' })).toMatchObject({ ok: true, purpose: 'link' });
    expect(await svc('svc_tg_confirm', { p_hash: 'h1', p_telegram: 555, p_name: 'Ali' })).toMatchObject({ ok: false });
    await svc('svc_tg_begin', { p_hash: 'h2', p_purpose: 'login' });
    expect(await svc('svc_tg_consume', { p_hash: 'h2' })).toEqual({ state: 'waiting' });
    await svc('svc_tg_confirm', { p_hash: 'h2', p_telegram: 555, p_name: 'Ali' });
    expect(await svc('svc_tg_consume', { p_hash: 'h2' })).toMatchObject({ state: 'ok', user: u });
    expect(await svc('svc_tg_consume', { p_hash: 'h2' })).toEqual({ state: 'expired' });
    const u2 = await user();
    await svc('svc_tg_begin', { p_hash: 'h3', p_purpose: 'link', p_user: u2 });
    expect(await svc('svc_tg_confirm', { p_hash: 'h3', p_telegram: 555, p_name: 'Ali' })).toMatchObject({ ok: false, error: 'telegram_used' });
  });

  test('parol kodi 5 urinishdan keyin o‘chadi', async () => {
    const u = await user();
    await svc('svc_reset_begin', { p_user: u, p_code_hash: 'good' });
    for (let i = 0; i < 5; i++) expect(await svc('svc_reset_check', { p_user: u, p_code_hash: 'bad' })).toBe(false);
    expect(await svc('svc_reset_check', { p_user: u, p_code_hash: 'good' })).toBe(false);
    await svc('svc_reset_begin', { p_user: u, p_code_hash: 'good' });
    expect(await svc('svc_reset_check', { p_user: u, p_code_hash: 'good' })).toBe(true);
    expect(await svc('svc_reset_check', { p_user: u, p_code_hash: 'good' })).toBe(false);
  });

  test('akkaunt o‘chirilsa uy bo‘shaydi, shaxsiy ma’lumot qolmaydi', async () => {
    const { uid, plot } = await owner();
    await svc('svc_delete_account', { p_user: uid });
    expect(await anon('api_plot', { p_plot: plot })).toMatchObject({ status: 'free' });
    expect((await sql('select login, instagram, telegram_id from profiles where user_id = $1', [uid]))[0]).toMatchObject({ instagram: null, telegram_id: null, login: expect.stringMatching(/^deleted_/) });
  });

  test('zaxira, kutish ro‘yxati, chegara, xabarlar', async () => {
    const b = (await svc('svc_backup')) as Record<string, unknown[]>;
    expect(b.profiles!.length).toBeGreaterThan(5);
    expect(await svc('svc_waitlist', { p_instagram: '@navbat_1' })).toBeGreaterThan(0);
    expect(await svc('svc_gazette_candidates', { p_nicks: ['yangi_nik', 'suka', 'navbat_1'] })).toBe(1);
    expect(await svc('svc_rate', { p_key: 'ip', p_max: 1, p_seconds: 3600 })).toBe(true);
    expect(await svc('svc_rate', { p_key: 'ip', p_max: 1, p_seconds: 3600 })).toBe(false);
    const u = await user();
    await sql('update profiles set telegram_id = 999 where user_id = $1', [u]);
    await sql("select private.notify($1::uuid, 'approved', '{}'::jsonb)", [u]);
    expect(await svc('svc_outbox')).toMatchObject(expect.arrayContaining([expect.objectContaining({ chat: 999 })]));
    expect(await svc('svc_outbox')).toEqual([]);
  });
});
