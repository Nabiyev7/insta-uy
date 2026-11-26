import { Component, type ReactNode } from 'react';

/** `fallback` funksiya bo'lsa — unga "qayta urinish" (xato holatini tozalash) beriladi. */
interface Props { readonly children: ReactNode; readonly fallback: ReactNode | ((retry: () => void) => ReactNode) }
/** React hali funksional xato chegarasini bermaydi — yagona class komponent. */
export class ErrorBoundary extends Component<Props, { readonly hasError: boolean }> {
  override state = { hasError: false };
  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }
  override componentDidCatch(error: Error): void {
    reportError(error); // monitoring.ts "error" hodisasini ushlaydi
  }
  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    const { fallback } = this.props;
    return typeof fallback === 'function' ? fallback(() => this.setState({ hasError: false })) : fallback;
  }
}
