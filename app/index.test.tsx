import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { productName } from '../lib/product';
import { takePicture } from '../test/picture';
import Home from './index';

/** What a person actually reads on the screen, with the markup taken back out. */
const visibleText = (markup: string) => markup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

describe('foundation', () => {
  it('first screen', () => {
    const markup = renderToStaticMarkup(<Home />);

    // The screen draws, and what it says is the product's own name — not the template's placeholder.
    expect(visibleText(markup)).toContain(productName());
    expect(visibleText(markup)).not.toContain('A new app');

    // Said as the screen's heading, so it is the first thing read and the first thing announced.
    expect(markup).toMatch(new RegExp(`<[^>]*role="heading"[^>]*>${productName()}<`));

    // Nothing on it is pinned to a size that the phone's largest text would be cut off by,
    // and nothing it says is cut short after so many lines.
    expect(markup).not.toMatch(/[;"](height|max-height|line-height)\s*:/);
    expect(markup).not.toContain('numberOfLines');

    takePicture('foundation > first screen', markup);
  });
});
