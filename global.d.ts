// ==============================================================================
// ReliabilityX — Offline React 18 & JSX TypeScript Ambient Type Definitions
// Provides complete offline types for React, ReactDOM, and JSX in Antigravity IDE
// ==============================================================================

declare namespace JSX {
  interface Element extends Record<string, any> {}
  interface ElementClass extends Record<string, any> {}
  interface ElementAttributesProperty {
    props: {};
  }
  interface ElementChildrenAttribute {
    children: {};
  }
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare module "react" {
  export interface FormEvent<T = any> {
    preventDefault(): void;
    stopPropagation(): void;
    target?: any;
    currentTarget?: any;
    [key: string]: any;
  }

  export interface SyntheticEvent<T = any> {
    preventDefault(): void;
    stopPropagation(): void;
    [key: string]: any;
  }

  export interface ChangeEvent<T = any> {
    target: { value: string; files?: any; [key: string]: any };
    currentTarget?: any;
    [key: string]: any;
  }

  export interface MouseEvent<T = any> {
    preventDefault(): void;
    stopPropagation(): void;
    [key: string]: any;
  }

  export type FC<P = {}> = (props: P) => any;
  export type ReactNode = any;
  export type ReactElement = any;
  export type ComponentType<P = {}> = (props: P) => any;

  export function useState<T>(initialState: T | (() => T)): [T, (val: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  export function useMemo<T>(factory: () => T, deps?: readonly any[]): T;
  export function useRef<T>(initialValue?: T): { current: T };
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps?: readonly any[]): T;
  export function createElement(type: any, props?: any, ...children: any[]): any;

  export interface ReactInstance {
    useState: typeof useState;
    useEffect: typeof useEffect;
    useMemo: typeof useMemo;
    useRef: typeof useRef;
    useCallback: typeof useCallback;
    createElement: typeof createElement;
    [key: string]: any;
  }

  const React: ReactInstance;
  export default React;
}

declare module "react-dom" {
  export interface Root {
    render(element: any): void;
    unmount(): void;
  }

  export function createRoot(container: any): Root;

  export interface ReactDOMInstance {
    createRoot: typeof createRoot;
    render?: any;
    [key: string]: any;
  }

  const ReactDOM: ReactDOMInstance;
  export default ReactDOM;
}

declare namespace React {
  interface FormEvent<T = any> {
    preventDefault(): void;
    stopPropagation(): void;
    target?: any;
    currentTarget?: any;
    [key: string]: any;
  }

  interface SyntheticEvent<T = any> {
    preventDefault(): void;
    stopPropagation(): void;
    [key: string]: any;
  }

  interface ChangeEvent<T = any> {
    target: { value: string; files?: any; [key: string]: any };
    currentTarget?: any;
    [key: string]: any;
  }

  interface MouseEvent<T = any> {
    preventDefault(): void;
    stopPropagation(): void;
    [key: string]: any;
  }

  type FC<P = {}> = (props: P) => any;
  type ReactNode = any;
  type ReactElement = any;
}
