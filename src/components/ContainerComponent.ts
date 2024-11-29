import { Canvas } from '../canvas/Canvas';
import { ImageComponent } from './ImageComponent';

export class ContainerComponent {
  private element: HTMLElement;
  private resizers: HTMLElement;
  private readonly MINIMUM_SIZE = 20;
  private originalWidth: number = 0;
  private originalHeight: number = 0;
  private originalX: number = 0;
  private originalY: number = 0;
  private originalMouseX: number = 0;
  private originalMouseY: number = 0;
  private currentResizer: HTMLElement | null = null;

  constructor() {
    this.element = document.createElement('div');
    this.element.classList.add('container-component');
    this.element.setAttribute('draggable', 'true');

    // Initialize resizers container
    this.resizers = document.createElement('div');
    this.resizers.classList.add('resizers');
    this.element.appendChild(this.resizers);

    // Add resizer handles
    this.addResizeHandles();

    // Add styles
    this.addStyles();

    // Add event listeners
    this.initializeEventListeners();
  }

  private addResizeHandles(): void {
    const positions = [
      { class: 'top-left', cursor: 'nwse-resize' },
      { class: 'top-right', cursor: 'nesw-resize' },
      { class: 'bottom-left', cursor: 'nesw-resize' },
      { class: 'bottom-right', cursor: 'nwse-resize' },
    ];

    positions.forEach(position => {
      const resizer = document.createElement('div');
      resizer.classList.add('resizer', position.class);
      resizer.addEventListener('mousedown', e => this.initResize(e, resizer));
      this.resizers.appendChild(resizer);
    });
  }

  private initResize(e: MouseEvent, resizer: HTMLElement): void {
    e.preventDefault();
    this.currentResizer = resizer;

    // Store original dimensions and positions
    this.originalWidth = parseFloat(
      getComputedStyle(this.element).getPropertyValue('width')
    );
    this.originalHeight = parseFloat(
      getComputedStyle(this.element).getPropertyValue('height')
    );
    this.originalX = this.element.getBoundingClientRect().left;
    this.originalY = this.element.getBoundingClientRect().top;
    this.originalMouseX = e.pageX;
    this.originalMouseY = e.pageY;

    // Add resize events
    window.addEventListener('mousemove', this.resize);
    window.addEventListener('mouseup', this.stopResize);
  }

  private resize = (e: MouseEvent): void => {
    if (!this.currentResizer) return;

    const deltaX = e.pageX - this.originalMouseX;
    const deltaY = e.pageY - this.originalMouseY;

    if (this.currentResizer.classList.contains('bottom-right')) {
      const width = this.originalWidth + deltaX;
      const height = this.originalHeight + deltaY;

      if (width > this.MINIMUM_SIZE) {
        this.element.style.width = `${width}px`;
      }
      if (height > this.MINIMUM_SIZE) {
        this.element.style.height = `${height}px`;
      }
    } else if (this.currentResizer.classList.contains('bottom-left')) {
      const height = this.originalHeight + deltaY;
      const width = this.originalWidth - deltaX;

      if (height > this.MINIMUM_SIZE) {
        this.element.style.height = `${height}px`;
      }
      if (width > this.MINIMUM_SIZE) {
        this.element.style.width = `${width}px`;
        this.element.style.left = `${this.originalX + deltaX}px`;
      }
    } else if (this.currentResizer.classList.contains('top-right')) {
      const width = this.originalWidth + deltaX;
      const height = this.originalHeight - deltaY;

      if (width > this.MINIMUM_SIZE) {
        this.element.style.width = `${width}px`;
      }
      if (height > this.MINIMUM_SIZE) {
        this.element.style.height = `${height}px`;
        this.element.style.top = `${this.originalY + deltaY}px`;
      }
    } else if (this.currentResizer.classList.contains('top-left')) {
      const width = this.originalWidth - deltaX;
      const height = this.originalHeight - deltaY;

      if (width > this.MINIMUM_SIZE) {
        this.element.style.width = `${width}px`;
        this.element.style.left = `${this.originalX + deltaX}px`;
      }
      if (height > this.MINIMUM_SIZE) {
        this.element.style.height = `${height}px`;
        this.element.style.top = `${this.originalY + deltaY}px`;
      }
    }
  };

  /**
   * On mouse up event the resizing stops and captures the state
   * Which will help keep tracking of state for undo/redo purpose
   */
  private stopResize = (): void => {
    window.removeEventListener('mousemove', this.resize);
    window.removeEventListener('mouseup', this.stopResize);
    this.currentResizer = null;

    //capture each resized state
    Canvas.historyManager.captureState();
  };

  private initializeEventListeners(): void {
    this.element.addEventListener('dragover', event => event.preventDefault());
    this.element.addEventListener('drop', this.onDrop.bind(this));
    this.element.addEventListener('mouseenter', this.onHover.bind(this));
    this.element.addEventListener('mouseleave', this.onBlur.bind(this));
  }

  private onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const componentType = event.dataTransfer?.getData('component-type');
    if (!componentType) return;

    const component = Canvas.createComponent(componentType);
    if (!component) return;

    //Getting class name of the container, since unique name is stored at position 2
    const containerClass = this.element.classList[2];
    const uniqueClass = Canvas.generateUniqueClass(
      componentType,
      true,
      containerClass
    );
    component.classList.add(uniqueClass);

    const label = document.createElement('span');
    label.className = 'component-label';
    label.textContent = uniqueClass;
    component.id = uniqueClass;
    label.style.display = 'none';
    component.appendChild(label);

    component.addEventListener('mouseenter', e => this.showLabel(e, component));
    component.addEventListener('mouseleave', e => this.hideLabel(e, component));

    this.element.appendChild(component);

    //capture state inside the container
    Canvas.historyManager.captureState();
  }

  private showLabel(event: MouseEvent, component: HTMLElement): void {
    event.stopPropagation();
    const label = component.querySelector('.component-label') as HTMLElement;
    if (label) {
      label.style.display = 'block';
    }
    component.classList.add('hover-active');
  }

  private hideLabel(event: MouseEvent, component: HTMLElement): void {
    event.stopPropagation();
    const label = component.querySelector('.component-label') as HTMLElement;
    if (label) {
      label.style.display = 'none';
    }
    component.classList.remove('hover-active');
  }

  private onHover(event: MouseEvent): void {
    if (event.target === this.element) {
      this.element.classList.add('hover-active');
    }
  }

  private onBlur(event: MouseEvent): void {
    if (event.target === this.element) {
      this.element.classList.remove('hover-active');
    }
  }

  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .container-component {
        display: flex;
        width: 100%;
        min-width: 100px;
        min-height: 100px;
      }
      .resizer {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: white;
        border: 3px solid #4286f4;
        position: absolute;
        display: none; /* Hide resizers by default */
      }
  
      /* Show resizers on hover */
      .container-component:hover .resizer {
        display: block;
      }
  
      .resizer.top-left {
        left: -5px;
        top: -5px;
        cursor: nwse-resize;
      }
  
      .resizer.top-right {
        right: -5px;
        top: -5px;
        cursor: nesw-resize;
      }
  
      .resizer.bottom-left {
        left: -5px;
        bottom: -5px;
        cursor: nesw-resize;
      }
  
      .resizer.bottom-right {
        right: -5px;
        bottom: -5px;
        cursor: nwse-resize;
      }
    `;
    document.head.appendChild(style);
  }

  public create(): HTMLElement {
    return this.element;
  }

  private static restoreResizer(element: HTMLElement): void {
    // Remove any existing resizers
    const oldResizers = element.querySelector('.resizers');
    if (oldResizers) {
      oldResizers.remove();
    }

    // Create new resizers container
    const resizersDiv = document.createElement('div');
    resizersDiv.classList.add('resizers');

    // Create temporary container instance to bind event listeners
    const container = new ContainerComponent();
    container.element = element;
    container.resizers = resizersDiv;

    // Add resize handles
    container.addResizeHandles();

    // Add new resizers to the element
    element.appendChild(resizersDiv);
  }

  public static restoreContainer(container: HTMLElement): void {
    // Restore resizer functionality
    ContainerComponent.restoreResizer(container);

    // Create a temporary instance of ContainerComponent to reuse its methods
    const containerInstance = new ContainerComponent();
    containerInstance.element = container;

    // Reapply controls to child components inside the container
    const containerChildren = container.querySelectorAll('.editable-component');
    containerChildren.forEach((child: any) => {
      // Add control buttons and draggable listeners
      Canvas.controlsManager.addControlButtons(child);
      Canvas.addDraggableListeners(child);

      // Bind the showLabel and hideLabel methods
      child.addEventListener('mouseenter', (event: MouseEvent) =>
        containerInstance.showLabel(event, child)
      );
      child.addEventListener('mouseleave', (event: MouseEvent) =>
        containerInstance.hideLabel(event, child)
      );

      // If the child is an image component, restore the image upload feature
      if (child.classList.contains('image-component')) {
        const imageSrc = child.querySelector('img')?.getAttribute('src') || ''; // Get the saved image source
        ImageComponent.restoreImageUpload(child, imageSrc);
      }

      // If the child is itself a container, restore it recursively
      if (child.classList.contains('container-component')) {
        this.restoreContainer(child);
      }
    });
  }
}
