/// <reference types="vite/client" />

declare module '*.yaml' {
  const data: Record<string, unknown>;
  export default data;
}
