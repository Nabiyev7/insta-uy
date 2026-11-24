/* 10-qadam: 9 ta lyuks bezak (7-leveldan). Narxlari admin panelda o'zgaradi. */
update public.decor_catalog set is_new = false where id in ('dam_besedka', 'dam_mangal', 'dam_basseyn', 'dam_stol', 'avto_sedan', 'avto_krossover', 'avto_sport', 'daraxt_olma', 'daraxt_orik', 'daraxt_gilos', 'daraxt_archa', 'daraxt_palma', 'gul_zor', 'gul_kamar', 'suv_hovuz');
insert into public.decor_catalog as c (id, slot, model_id, name_uz, name_ru, price_uzs, price_coins, stock, spots, min_level, sort, is_new) values
('lux_pavilyon','yard','lux_pavilyon','Pavilyon','Павильон',400000,8000,null,array['left'],7,800,true),
('lux_gril','yard','lux_gril','Gril oshxona','Гриль-кухня',200000,4000,null,array['right'],7,810,true),
('lux_basseyn','water','lux_basseyn','Lyuks basseyn va jakuzi','Люкс-бассейн с джакузи',500000,10000,null,array['left'],7,820,true),
('lux_favvora','water','lux_favvora','Marmar favvora','Мраморный фонтан',300000,6000,null,array['right','left'],7,830,true),
('lux_bog','yard','lux_bog','Fransuz bog''i','Французский сад',250000,5000,null,array['right','left'],7,840,true),
('lux_limuzin','car','lux_limuzin','Limuzin','Лимузин',600000,12000,null,array['car'],7,850,true),
('lux_superkar','car','lux_superkar','Superkar','Суперкар',750000,15000,null,array['car'],7,860,true),
('lux_jip','car','lux_jip','Lyuks jip','Люкс-внедорожник',500000,10000,null,array['car'],7,870,true),
('lux_daraxt','tree','lux_daraxt','Tuvakdagi daraxt','Дерево в кадке',150000,3000,null,array['corner','pet'],7,880,true)
on conflict (id) do nothing;
