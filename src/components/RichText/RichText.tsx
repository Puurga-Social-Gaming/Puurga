import React from 'react';
import { parseContent } from '../../utils/linkParser';
import LinkPreview from '../LinkPreview/LinkPreview';
import Hashtag from '../Hashtag/Hashtag';
import Mention from '../Mention/Mention';

interface RichTextProps {
  content: string;
  onHashtagClick?: (tag: string) => void;
  onMentionClick?: (username: string, userId?: string) => void;
  showLinkPreviews?: boolean;
  compactLinks?: boolean;
}

const RichText: React.FC<RichTextProps> = ({
  content,
  onHashtagClick,
  onMentionClick,
  showLinkPreviews = true,
  compactLinks = false
}) => {
  const parsed = parseContent(content);

  // If no rich content, return plain text
  if (parsed.links.length === 0 && parsed.hashtags.length === 0 && parsed.mentions.length === 0) {
    return <span className="whitespace-pre-wrap">{content}</span>;
  }

  // Split content by links, hashtags, and mentions
  const segments: Array<{
    type: 'text' | 'link' | 'hashtag' | 'mention';
    content: string;
    index?: number;
  }> = [];

  let lastIndex = 0;
  const allMarkers = [
    ...parsed.links.map(l => ({ type: 'link' as const, content: l.url, index: content.indexOf(l.url) })),
    ...parsed.hashtags.map(h => ({ type: 'hashtag' as const, content: `#${h.tag}`, index: h.index })),
    ...parsed.mentions.map(m => ({ type: 'mention' as const, content: `@${m.username}`, index: m.index }))
  ].sort((a, b) => a.index - b.index);

  allMarkers.forEach((marker) => {
    if (marker.index > lastIndex) {
      segments.push({
        type: 'text',
        content: content.substring(lastIndex, marker.index)
      });
    }
    segments.push(marker);
    lastIndex = marker.index + marker.content.length;
  });

  if (lastIndex < content.length) {
    segments.push({
      type: 'text',
      content: content.substring(lastIndex)
    });
  }

  return (
    <div className="rich-text-content">
      {segments.map((segment, idx) => {
        if (segment.type === 'text') {
          return <span key={idx} className="whitespace-pre-wrap">{segment.content}</span>;
        }

        if (segment.type === 'link') {
          const link = parsed.links.find(l => l.url === segment.content);
          if (link) {
            if (showLinkPreviews && !compactLinks) {
              return (
                <div key={idx} className="my-2">
                  <LinkPreview url={link.url} />
                </div>
              );
            }
            return (
              <LinkPreview key={idx} url={link.url} compact={compactLinks} />
            );
          }
        }

        if (segment.type === 'hashtag') {
          const hashtag = parsed.hashtags.find(h => `#${h.tag}` === segment.content);
          if (hashtag) {
            return <Hashtag key={idx} tag={hashtag.tag} onClick={onHashtagClick} />;
          }
        }

        if (segment.type === 'mention') {
          const mention = parsed.mentions.find(m => `@${m.username}` === segment.content);
          if (mention) {
            return <Mention key={idx} username={mention.username} onClick={onMentionClick} />;
          }
        }

        return <span key={idx}>{segment.content}</span>;
      })}
    </div>
  );
};

export default RichText;