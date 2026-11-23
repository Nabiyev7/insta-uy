import { Component, type ReactNode } from 'react';

interface Props { readonly children: ReactNode; readonly fallback: ReactNode }
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
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
