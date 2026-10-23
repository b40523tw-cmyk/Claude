import { render } from 'preact';
import { App } from './ui/App';
import './style.css';

type HotApi = { ready?: (fn: (data: unknown) => void) => void; data?: unknown };
const hot = (window as unknown as { claude?: { hot?: HotApi } }).claude?.hot;

function start(data: unknown) {
  render(<App hot={(data ?? {}) as never} />, document.getElementById('app')!);
}

if (hot?.ready) hot.ready(start);
else start(hot?.data ?? {});
