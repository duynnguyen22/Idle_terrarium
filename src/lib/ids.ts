/** Same shape as the prototype: 'item_' + 7 base36 chars. */
export function createItemId(): string {
  return 'item_' + Math.random().toString(36).slice(2, 9)
}
