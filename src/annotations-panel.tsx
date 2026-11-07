import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import type { PaintMark } from './reader/pdf-panel'

export interface AnnotationsPanelProps {
  marks: readonly PaintMark[]
  currentPage: number
  onGoToPage: (page: number) => void
  onClose: () => void
}

type Scope = 'page' | 'paper'

const PANEL_CSS = `
.oan-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  color: var(--foreground, #20242b);
  background: var(--background, #fff);
  font: inherit;
  font-size: 13px;
  line-height: 1.55;
  border-inline-start: 1px solid var(--border, #d8dde5);
}
.oan-panel *, .oan-panel *::before, .oan-panel *::after {
  box-sizing: border-box;
}
.oan-header {
  flex: 0 0 auto;
  padding: 12px;
  border-bottom: 1px solid var(--border, #d8dde5);
}
.oan-heading-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.oan-title {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
}
.oan-button {
  appearance: none;
  margin: 0;
  border: 1px solid var(--border, #d8dde5);
  border-radius: 6px;
  background: var(--background, #fff);
  color: inherit;
  font: inherit;
  cursor: pointer;
  padding: 4px 8px;
  line-height: 1.5;
}
.oan-button:hover {
  background: var(--muted, #f0f3f7);
}
.oan-button:focus-visible, .oan-search:focus-visible, .oan-image-summary:focus-visible {
  outline: 2px solid var(--brand, #476bc7);
  outline-offset: 2px;
}
.oan-scope {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}
.oan-scope-button {
  flex: 1 1 0;
  min-width: 0;
}
.oan-scope-button[aria-pressed="true"] {
  background: var(--foreground, #20242b);
  color: var(--background, #fff);
  border-color: var(--foreground, #20242b);
}
.oan-search-label {
  display: block;
  margin: 10px 0 4px;
  font-size: 12px;
}
.oan-search {
  display: block;
  width: 100%;
  min-width: 0;
  border: 1px solid var(--border, #d8dde5);
  border-radius: 6px;
  padding: 7px 8px;
  background: var(--background, #fff);
  color: inherit;
  font: inherit;
  line-height: 1.5;
  user-select: text;
}
.oan-counts {
  margin: 8px 0 0;
  color: var(--muted-foreground, #606b7a);
  font-size: 12px;
  overflow-wrap: anywhere;
}
.oan-scroll {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  padding: 10px;
}
.oan-empty {
  margin: 10px 2px;
  color: var(--muted-foreground, #606b7a);
  overflow-wrap: anywhere;
}
.oan-empty p {
  margin: 0 0 10px;
}
.oan-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.oan-card {
  border: 1px solid var(--border, #d8dde5);
  border-radius: 8px;
  background: var(--background, #fff);
  padding: 10px;
  min-width: 0;
}
.oan-card-header {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 8px;
}
.oan-dot {
  flex: 0 0 9px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1px solid rgba(90, 100, 115, .35);
}
.oan-page-button {
  padding: 2px 7px;
  font-size: 12px;
}
.oan-note {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: normal;
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
  line-height: 1.7;
}
.oan-image {
  margin-top: 10px;
  border-top: 1px solid var(--border, #d8dde5);
  padding-top: 7px;
}
.oan-image-summary {
  cursor: pointer;
  font-size: 12px;
  color: var(--muted-foreground, #606b7a);
}
.oan-image-content {
  display: block;
  width: 100%;
  height: auto;
  margin-top: 7px;
  border-radius: 4px;
}
`

const MARK_COLORS: Record<string, string> = {
  yellow: '#e3b02f',
  green: '#40a56a',
  blue: '#4d8ed8',
  purple: '#a56cd4',
  pink: '#d965a0',
  red: '#d96565',
  orange: '#d98d42',
}

function searchText(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase()
}

/** Read-only comments, kept in a separate scroll area beside the PDF. */
export function AnnotationsPanel({
  marks,
  currentPage,
  onGoToPage,
  onClose,
}: AnnotationsPanelProps): ReactNode {
  const [scope, setScope] = useState<Scope>('page')
  const [query, setQuery] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const comments = useMemo(() => marks
    .filter(mark => mark.note.trim() !== '')
    .map((mark, order) => ({ mark, order }))
    .sort((left, right) => left.mark.page - right.mark.page || left.order - right.order)
    .map(item => item.mark), [marks])

  const pageComments = useMemo(() => comments.filter(mark => mark.page === currentPage), [comments, currentPage])
  const normalizedQuery = searchText(query.trim())
  const inScope = scope === 'page' ? pageComments : comments
  const visible = useMemo(() => normalizedQuery === ''
    ? inScope
    : inScope.filter(mark => searchText(mark.note).includes(normalizedQuery)), [inScope, normalizedQuery])

  const pageLabel = currentPage > 0 ? `第 ${currentPage} 页` : '当前页'
  const searchId = useId()
  const scopePage = scope === 'page' ? currentPage : 0

  useEffect(() => {
    if (scrollRef.current !== null) scrollRef.current.scrollTop = 0
  }, [scope, scopePage, normalizedQuery])

  let empty: ReactNode = null
  if (comments.length === 0) {
    empty = <p>这篇文献没有文字批注。</p>
  } else if (scope === 'page' && pageComments.length === 0) {
    empty = (
      <>
        <p>{pageLabel}没有文字批注。整篇共有 {comments.length} 条文字批注。</p>
        <button className="oan-button" type="button" onClick={() => setScope('paper')}>查看整篇批注</button>
      </>
    )
  } else if (visible.length === 0) {
    empty = (
      <>
        <p>{scope === 'page' ? pageLabel : '整篇'}没有匹配的文字批注。</p>
        <button className="oan-button" type="button" onClick={() => setQuery('')}>清空搜索</button>
      </>
    )
  }

  return (
    <aside className="oan-panel" aria-label="文字批注">
      <style>{PANEL_CSS}</style>
      <header className="oan-header">
        <div className="oan-heading-row">
          <h2 className="oan-title">文字批注</h2>
          <button className="oan-button" type="button" onClick={onClose} aria-label="收起批注栏" title="收起批注栏">收起</button>
        </div>
        <div className="oan-scope" role="group" aria-label="批注范围">
          <button className="oan-button oan-scope-button" type="button" aria-pressed={scope === 'page'} onClick={() => setScope('page')}>当前页 {pageComments.length}</button>
          <button className="oan-button oan-scope-button" type="button" aria-pressed={scope === 'paper'} onClick={() => setScope('paper')}>整篇 {comments.length}</button>
        </div>
        <label className="oan-search-label" htmlFor={searchId}>搜索批注全文</label>
        <input
          id={searchId}
          className="oan-search"
          type="search"
          placeholder="输入关键词"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        <p className="oan-counts" role="status" aria-live="polite">
          共 {comments.length} 条 · 当前筛选 {visible.length} 条
          <br />
          {scope === 'page' ? pageLabel : '按页码排列'} · 可选择文字复制
        </p>
      </header>
      <div ref={scrollRef} className="oan-scroll" aria-label="批注列表" tabIndex={0}>
        {empty !== null ? <div className="oan-empty">{empty}</div> : (
          <ol className="oan-list">
            {visible.map((mark, index) => (
              <li className="oan-card" key={`${mark.id}:${mark.page}:${index}`}>
                <div className="oan-card-header">
                  <span className="oan-dot" style={{ backgroundColor: MARK_COLORS[mark.color ?? ''] ?? '#929aa6' }} aria-hidden="true" />
                  <button
                    className="oan-button oan-page-button"
                    type="button"
                    onClick={() => onGoToPage(mark.page)}
                    aria-label={`跳转到第 ${mark.page} 页`}
                  >第 {mark.page} 页</button>
                </div>
                <p className="oan-note">{mark.note}</p>
                {mark.asset === undefined || mark.asset.trim() === '' ? null : (
                  <details className="oan-image">
                    <summary className="oan-image-summary">查看批注图片</summary>
                    <img className="oan-image-content" src={mark.asset} alt={`第 ${mark.page} 页的批注图片`} loading="lazy" />
                  </details>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
  )
}
