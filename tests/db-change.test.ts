import { shouldRefreshOnDbChange, isMatchingPropertyKey } from '../src/db-change'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

console.log('Running db-change tests...')

// 1. Property key matching
assert(isMatchingPropertyKey(':user.property/parent', ['parent']), 'matches :user.property/parent')
assert(isMatchingPropertyKey('user.property/parent', ['parent']), 'matches user.property/parent')
assert(isMatchingPropertyKey(':parent', ['parent']), 'matches :parent')
assert(isMatchingPropertyKey('parent', ['parent']), 'matches parent')
assert(isMatchingPropertyKey(':user.property/tags', ['tags']), 'matches :user.property/tags')
assert(isMatchingPropertyKey(':page-tags', ['page-tags']), 'matches :page-tags')
assert(isMatchingPropertyKey(':user.property/page-tags', ['page-tags']), 'matches :user.property/page-tags')
assert(isMatchingPropertyKey(':user.property/页面标签', ['页面标签']), 'matches :user.property/页面标签')
assert(isMatchingPropertyKey('页面标签', ['页面标签']), 'matches 页面标签')

// :block/parent is outliner tree structure, NOT hierarchy property
assert(!isMatchingPropertyKey(':block/parent', ['parent']), ':block/parent must NOT match hierarchy parent')
assert(!isMatchingPropertyKey('block/parent', ['parent']), 'block/parent must NOT match hierarchy parent')
assert(!isMatchingPropertyKey(':block/content', ['parent', 'tags']), ':block/content must NOT match')

// 2. Typing inside a block
const typingPayload = {
  txData: [
    [1, ':block/content', 'hello world', 10, true],
    [1, ':logseq.property/updated-at', 123456789, 10, true],
    [1, ':db/txInstant', 123456789, 10, true],
  ] as any,
}
assert(!shouldRefreshOnDbChange(typingPayload, 'parent'), 'Typing in block should NOT trigger refresh')

// 3. Pressing Enter to split block / create new block
const splitBlockPayload = {
  txMeta: { outlinerOp: 'split-block' },
  txData: [
    [2, ':block/uuid', 'uuid-test', 11, true],
    [2, ':block/parent', 1, 11, true],
    [2, ':block/order', '2', 11, true],
    [2, ':block/left', 1, 11, true],
    [2, ':block/title', '', 11, true],
    [2, ':block/page', 50, 11, true],
    [2, ':logseq.property/updated-at', 123456790, 11, true],
  ] as any,
}
assert(!shouldRefreshOnDbChange(splitBlockPayload, 'parent'), 'Split block / newline should NOT trigger refresh')

// 4. Indenting / unindenting block
const indentBlockPayload = {
  txMeta: { outlinerOp: 'move-blocks' },
  txData: [
    [2, ':block/parent', 3, 12, true],
    [2, ':block/left', 4, 12, true],
    [2, ':block/order', '1', 12, true],
  ] as any,
}
assert(!shouldRefreshOnDbChange(indentBlockPayload, 'parent'), 'Indent block should NOT trigger refresh')

// 5. Adding page tag (:block/tags)
const addTagPayload = {
  txData: [
    [50, ':block/tags', 200, 13, true],
    [50, ':logseq.property/updated-at', 123456795, 13, true],
  ] as any,
}
assert(shouldRefreshOnDbChange(addTagPayload, 'parent'), 'Adding page tag SHOULD trigger refresh')

// 6. Removing page tag
const removeTagPayload = {
  txData: [
    [50, ':block/tags', 200, 14, false],
  ] as any,
}
assert(shouldRefreshOnDbChange(removeTagPayload, 'parent'), 'Removing page tag SHOULD trigger refresh')

// 7. Modifying hierarchy property (:user.property/parent)
const editParentPropertyPayload = {
  txData: [
    [50, ':user.property/parent', '[[RootPage]]', 15, true],
  ] as any,
}
assert(shouldRefreshOnDbChange(editParentPropertyPayload, 'parent'), 'Modifying parent property SHOULD trigger refresh')

// 8. Modifying page property map (:block/properties)
const editPropertiesMapPayload = {
  txData: [
    [50, ':block/properties', { parent: '[[RootPage]]' }, 16, true],
  ] as any,
}
assert(shouldRefreshOnDbChange(editPropertiesMapPayload, 'parent'), 'Modifying properties map SHOULD trigger refresh')

// 9. Page rename (:block/original-name)
const renamePagePayload = {
  txData: [
    [50, ':block/original-name', 'Renamed Title', 17, true],
  ] as any,
}
assert(shouldRefreshOnDbChange(renamePagePayload, 'parent'), 'Page rename SHOULD trigger refresh')

// 10. Page deletion (:block/trash?)
const deletePagePayload = {
  txData: [
    [50, ':block/trash?', true, 18, true],
  ] as any,
}
assert(shouldRefreshOnDbChange(deletePagePayload, 'parent'), 'Page trash SHOULD trigger refresh')

// 11. Creating new page (:block/type "page")
const newPagePayload = {
  txData: [
    [60, ':block/type', 'page', 19, true],
    [60, ':block/name', 'new-page', 19, true],
  ] as any,
}
assert(shouldRefreshOnDbChange(newPagePayload, 'parent'), 'Creating new page SHOULD trigger refresh')

// 12. Graph favorites changed
const favoritesPayload = {
  txData: [
    [1, ':ui/favorites', ['page-a', 'page-b'], 20, true],
  ] as any,
}
assert(shouldRefreshOnDbChange(favoritesPayload, 'parent'), 'Favorites change SHOULD trigger refresh')

// 13. Fallback: outlinerOp with child blocks and no txData
const fallbackOutlinerPayload = {
  txMeta: { outlinerOp: 'insert-blocks' },
  blocks: [
    { uuid: 'b1', parent: { id: 1 }, content: 'text' },
    { uuid: 'b2', parent: { id: 1 }, content: 'text2' },
  ],
}
assert(!shouldRefreshOnDbChange(fallbackOutlinerPayload, 'parent'), 'Fallback outlinerOp with child blocks should NOT trigger refresh')

// 14. Typing "tags:: [[Parent]]" in block content
const blockWithTagsSyntaxPayload = {
  txData: [
    [10, ':block/content', 'tags:: [[ParentPage]]', 23, true],
    [10, ':logseq.property/updated-at', 123456799, 23, true],
  ] as any,
}
assert(shouldRefreshOnDbChange(blockWithTagsSyntaxPayload, 'parent'), 'Block content with tags:: SHOULD trigger refresh')

// 15. Typing "parent:: [[Parent]]" in block content
const blockWithParentSyntaxPayload = {
  txData: [
    [10, ':block/content', 'parent:: [[ParentPage]]', 24, true],
    [10, ':logseq.property/updated-at', 123456800, 24, true],
  ] as any,
}
assert(shouldRefreshOnDbChange(blockWithParentSyntaxPayload, 'parent'), 'Block content with parent:: SHOULD trigger refresh')

// 16. Block with tags in payload.blocks
const blockObjectWithTagsPayload = {
  blocks: [
    { uuid: 'p1', name: 'my-page', tags: ['ParentPage'] },
  ],
}
assert(shouldRefreshOnDbChange(blockObjectWithTagsPayload, 'parent'), 'Block object with tags SHOULD trigger refresh')

console.log('All db-change tests passed successfully!')

