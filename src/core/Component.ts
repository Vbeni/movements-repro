export type ComponentOptions = Record<string, unknown>;

export abstract class Component<O extends ComponentOptions = ComponentOptions> {
  constructor(
    protected view: HTMLElement,
    protected options: O,
  ) {}

  init(): void {}

  resize(): void {}

  /** Called once the page is visible; `index` is the component's position on the page. */
  animateIn(_index: number): void {}

  destroy(): void {}
}

export type ComponentClass = new (view: HTMLElement, options: ComponentOptions) => Component;
