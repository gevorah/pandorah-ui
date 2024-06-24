import { type ReactElement } from 'react';
import {
  $applyNodeReplacement,
  DecoratorNode,
  type DOMConversionMap,
  type DOMExportOutput,
  type EditorConfig,
  type ElementFormatType,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread
} from 'lexical';

import { Image } from './Image';

export type ImagePayload = {
  src: string;
  alt?: string;
  width?: string | number;
  height?: string | number;
  format?: ElementFormatType;
  key?: NodeKey;
};

export type SerializedImageNode = Spread<
  {
    src: string;
    alt: string;
    width: string | number;
    height: string | number;
    format: ElementFormatType;
  },
  SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<ReactElement> {
  __src: string;
  __alt: string;
  __width: string | number;
  __height: string | number;
  __format: ElementFormatType;

  constructor(
    src: string,
    alt?: string,
    width?: string | number,
    height?: string | number,
    format?: ElementFormatType,
    key?: NodeKey
  ) {
    super(key);
    this.__src = src;
    this.__alt = alt || '';
    this.__width = width || '100%';
    this.__height = height || 'auto';
    this.__format = format || '';
  }

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__alt,
      node.__width,
      node.__height,
      node.__format,
      node.__key
    );
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { src, alt, width, height, format } = serializedNode;
    const node = $createImageNode({ src, alt, width, height, format });
    return node;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: (_: Node) => ({
        conversion: (element) => {
          const img = element as HTMLImageElement;
          const { src, alt } = img;
          const width = img.getAttribute('data-width');
          const height = img.getAttribute('data-height');
          const format = img.getAttribute('data-align');
          const node = $createImageNode({ src, alt });
          if (width) {
            node.setWidth(width);
          }
          if (height) {
            node.setHeight(height);
          }
          if (format) {
            node.setFormat(format as ElementFormatType);
          }
          return { node };
        },
        priority: 0
      })
    };
  }

  exportJSON(): SerializedImageNode {
    return {
      type: this.getType(),
      src: this.getSrc(),
      alt: this.getAlt(),
      width: this.__width,
      height: this.__height,
      format: this.__format || '',
      version: 1
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('img');
    element.setAttribute('src', this.__src);
    element.setAttribute('alt', this.__alt);
    element.setAttribute('data-width', this.__width.toString());
    element.setAttribute('data-height', this.__height.toString());
    element.setAttribute('data-align', this.__format);
    return { element };
  }

  createDOM(config: EditorConfig): HTMLElement {
    const figure = document.createElement('figure');
    const className = config.theme.image;
    if (className !== undefined) {
      figure.className = className;
    }
    return figure;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): ReactElement {
    return (
      <Image
        src={this.__src}
        alt={this.__alt}
        width={this.__width}
        height={this.__height}
        format={this.__format}
        nodeKey={this.getKey()}
        resizable={true}
      />
    );
  }

  isInline(): false {
    return false;
  }

  canIndent(): false {
    return false;
  }

  getSrc(): string {
    return this.__src;
  }

  getAlt(): string {
    return this.__alt;
  }

  setWidth(width: string | number): void {
    const writable = this.getWritable();
    writable.__width = width;
  }

  setHeight(height: string | number): void {
    const writable = this.getWritable();
    writable.__height = height;
  }

  setFormat(format: ElementFormatType): void {
    const self = this.getWritable();
    self.__format = format;
  }
}

export function $createImageNode(payload: ImagePayload): ImageNode {
  return $applyNodeReplacement(
    new ImageNode(
      payload.src,
      payload.alt,
      payload.width,
      payload.height,
      payload.format,
      payload.key
    )
  );
}

export function $isImageNode(node?: LexicalNode | null): node is ImageNode {
  return node instanceof ImageNode;
}

