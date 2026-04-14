import { cn } from "@/lib/utils";

type StructuredTextSegment =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

const BULLET_LINE_PATTERN = /^\s*(?:-|•)\s+(.*)$/;
const BLANK_LINE_PATTERN = /^\s*$/;

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

function parseStructuredText(value: string): StructuredTextSegment[] {
  const lines = normalizeLineEndings(value).split("\n");
  const segments: StructuredTextSegment[] = [];

  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    const text = paragraphLines.join("\n").trim();
    paragraphLines = [];
    if (!text) return;
    segments.push({ type: "paragraph", text });
  };

  const flushList = () => {
    if (listItems.length === 0) return;
    const items = listItems
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    listItems = [];
    if (items.length === 0) return;
    segments.push({ type: "list", items });
  };

  for (const rawLine of lines) {
    if (BLANK_LINE_PATTERN.test(rawLine)) {
      flushParagraph();
      flushList();
      continue;
    }

    const bulletMatch = rawLine.match(BULLET_LINE_PATTERN);
    if (bulletMatch) {
      flushParagraph();
      const item = bulletMatch[1].trim();
      if (item.length > 0) {
        listItems.push(item);
      }
      continue;
    }

    if (listItems.length > 0) {
      flushList();
    }

    paragraphLines.push(rawLine.trimEnd());
  }

  flushParagraph();
  flushList();

  return segments;
}

type LightweightStructuredTextProps = {
  value: string;
  className?: string;
  paragraphClassName?: string;
  listClassName?: string;
  listItemClassName?: string;
};

export function LightweightStructuredText({
  value,
  className,
  paragraphClassName,
  listClassName,
  listItemClassName,
}: LightweightStructuredTextProps) {
  const segments = parseStructuredText(value);

  if (segments.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3.5", className)}>
      {segments.map((segment, index) =>
        segment.type === "paragraph" ? (
          <p key={`p-${index}`} className={cn("whitespace-pre-line", paragraphClassName)}>
            {segment.text}
          </p>
        ) : (
          <ul key={`l-${index}`} className={cn("list-disc space-y-2 pl-5", listClassName)}>
            {segment.items.map((item, itemIndex) => (
              <li
                key={`li-${index}-${itemIndex}`}
                className={cn("whitespace-pre-line", listItemClassName)}
              >
                {item}
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
