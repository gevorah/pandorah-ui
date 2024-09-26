import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND
} from '@lexical/list';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import { MenuOption } from '@lexical/react/LexicalNodeMenuPlugin';
import {
  LexicalTypeaheadMenuPlugin,
  useBasicTypeaheadTriggerMatch
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  TextNode,
  type LexicalEditor
} from 'lexical';
import {
  Heading1,
  Heading2,
  Heading3,
  Image,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Text
} from 'lucide-react';
import * as ReactDOM from 'react-dom';

import { cn } from '@/lib/utils';

import icon from '../../assets/icon.png';
import { INSERT_IMAGE_COMMAND } from '../ImagePlugin/ImagePlugin';

class ComponentPickerOption extends MenuOption {
  title: string;
  icon?: ReactNode;
  keywords: Array<string>;
  onSelect: (queryString: string) => void;

  constructor(
    title: string,
    options: {
      icon?: ReactNode;
      keywords?: Array<string>;
      onSelect: (queryString: string) => void;
    }
  ) {
    super(title);
    this.title = title;
    this.keywords = options.keywords || [];
    this.icon = options.icon;
    this.onSelect = options.onSelect.bind(this);
  }
}

type SlashMenuItemProps = {
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  option: ComponentPickerOption;
};

const ComponentPickerMenuItem = (props: SlashMenuItemProps) => {
  const { index, isSelected, onClick, onMouseEnter, option } = props;

  return (
    <li
      key={option.key}
      ref={option.setRefElement}
      id={'typeahead-item-' + index}
      role="option"
      aria-selected={isSelected}
      tabIndex={-1}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={cn(
        'flex cursor-pointer flex-row items-center gap-2 rounded-md px-1.5 py-1 outline-none',
        isSelected && 'bg-neutral-900/10'
      )}
    >
      {option.icon}
      <span className="flex-1 text-nowrap text-base">{option.title}</span>
    </li>
  );
};

function getBaseOptions(editor: LexicalEditor) {
  return [
    new ComponentPickerOption('Paragraph', {
      icon: <Text className="size-4" />,
      keywords: ['normal', 'paragraph', 'p', 'text'],
      onSelect: () =>
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createParagraphNode());
          }
        })
    }),
    new ComponentPickerOption('Heading 1', {
      icon: <Heading1 className="size-4" />,
      keywords: ['heading', 'h1'],
      onSelect: () =>
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode('h1'));
          }
        })
    }),
    new ComponentPickerOption('Heading 2', {
      icon: <Heading2 className="size-4" />,
      keywords: ['heading', 'h2'],
      onSelect: () =>
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode('h2'));
          }
        })
    }),
    new ComponentPickerOption('Heading 3', {
      icon: <Heading3 className="size-4" />,
      keywords: ['heading', 'h3'],
      onSelect: () =>
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode('h3'));
          }
        })
    }),
    new ComponentPickerOption('Bulleted List', {
      icon: <List className="size-4" />,
      keywords: ['bulleted list', 'unordered list', 'ul'],
      onSelect: () =>
        editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
    }),
    new ComponentPickerOption('Numbered List', {
      icon: <ListOrdered className="size-4" />,
      keywords: ['numbered list', 'ordered list', 'ol'],
      onSelect: () =>
        editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
    }),
    new ComponentPickerOption('Check List', {
      icon: <ListChecks className="size-4" />,
      keywords: ['check list', 'todo list'],
      onSelect: () =>
        editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined)
    }),
    new ComponentPickerOption('Quote', {
      icon: <Quote className="size-4" />,
      keywords: ['blockquote', 'quote'],
      onSelect: () =>
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createQuoteNode());
          }
        })
    }),
    new ComponentPickerOption('Divider', {
      icon: <Minus className="size-4" />,
      keywords: ['horizontal rule', 'divider', 'hr'],
      onSelect: () =>
        editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)
    }),
    new ComponentPickerOption('Image', {
      icon: <Image className="size-4" />,
      keywords: ['image', 'img'],
      onSelect: () =>
        editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
          src: icon,
          width: '30%'
        })
    })
  ];
}

export const SlashCommandPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>(null);

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch('/', {
    minLength: 0
  });

  const options = useMemo(() => {
    const baseOptions = getBaseOptions(editor);

    if (!queryString) {
      return baseOptions;
    }

    const regex = new RegExp(queryString, 'i');

    return baseOptions.filter(
      (option) =>
        regex.test(option.title) ||
        option.keywords.some((keyword) => regex.test(keyword))
    );
  }, [editor, queryString]);

  const onSelectOption = useCallback(
    (
      selectedOption: ComponentPickerOption,
      nodeToRemove: TextNode | null,
      closeMenu: () => void,
      matchingString: string
    ) => {
      editor.update(() => {
        nodeToRemove?.remove();
        selectedOption.onSelect(matchingString);
        closeMenu();
      });
    },
    [editor]
  );

  return (
    <LexicalTypeaheadMenuPlugin<ComponentPickerOption>
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={checkForTriggerMatch}
      options={options}
      menuRenderFn={(
        anchorElementRef,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }
      ) =>
        anchorElementRef.current && options.length
          ? ReactDOM.createPortal(
              <div className="flex min-w-48 flex-col rounded-md bg-white p-1.5 shadow-md">
                <ul>
                  {options.map((option, i: number) => (
                    <ComponentPickerMenuItem
                      key={option.key}
                      index={i}
                      isSelected={selectedIndex === i}
                      onClick={() => {
                        setHighlightedIndex(i);
                        selectOptionAndCleanUp(option);
                      }}
                      onMouseEnter={() => {
                        setHighlightedIndex(i);
                      }}
                      option={option}
                    />
                  ))}
                </ul>
              </div>,
              anchorElementRef.current
            )
          : null
      }
    />
  );
};

