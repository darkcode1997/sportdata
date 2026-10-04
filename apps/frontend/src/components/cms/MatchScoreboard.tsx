'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import useSWR, { useSWRConfig } from 'swr';
import { ArrowLeft, Check, Expand, History, Pause, Play, RefreshCw, Undo2, X } from 'lucide-react';
import { api, fetcher, getAuthToken } from '@/lib/api';
import styles from './MatchScoreboard.module.css';
import { ScoreboardAthleteRow } from './ScoreboardAthleteRow';

type Award = { id: number; side: number; award: string; points: number; remainingMs: number; at: string; penaltyLevel?: number; undone?: boolean };
type Athlete = { id: string; fullName: string; country?: { code: string }; federation?: { name: string } };
type Board = {
  id: string; eventId: string; matchNumber?: number; status: string; resultStatus: string; resultVersion: number;
  category: { name: string; matchDurationSeconds?: number }; event: { name: string };
  fop?: string; athlete1Id: string; athlete2Id: string; winnerId?: string; winMethod?: string;
  proposedWinnerId?: string | null; proposedWinMethod?: string | null; outcomeReason?: string | null;
  athlete1Score: number; athlete2Score: number; athlete1Advantages: number; athlete2Advantages: number;
  athlete1Penalties: number; athlete2Penalties: number;
  resultData?: { scoreboard?: { remainingMs: number; runningSince: string | null; actions: Award[] } };
  serverNow: string; receivedAt: number; blockedReason?: string;
};
type Command = { action: string; side?: number; award?: string; points?: number; penaltyLevel?: number; winnerId?: string; winMethod?: string };
const awardLabels: Record<string, string> = { POINTS: 'Điểm', ADVANTAGE: 'Lợi thế', PENALTY: 'Phạt', SUBMISSION: 'Submission', ATTACK: 'Chủ động tấn công' };
const methods = [ ['POINTS', 'Điểm'], ['SUBMISSION', 'Submission'], ['DECISION', 'Quyết định trọng tài'], ['DISQUALIFICATION', 'Truất quyền'], ['IPPON', 'Ippon'], ['KNOCKOUT', 'Knockout'], ['TECHNICAL', 'Kỹ thuật'], ['WALKOVVER', 'Bỏ cuộc'] ];
function timeLabel(ms: number) {
  const seconds = Math.ceil(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
const stampBoard = (board: Board): Board => ({ ...board, receivedAt: Date.now() });
const boardFetcher = async (url: string): Promise<Board> => stampBoard((await api.get<Board>(url, { timeout: 10000 })).data);

export function MatchScoreboard({ matchId }: { matchId: string }) {
  const root = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const { mutate: refreshCache } = useSWRConfig();
  const endpoint = `/results/matches/${matchId}/scoreboard`;
  const { data: board, error: loadError, mutate } = useSWR<Board>(endpoint, boardFetcher, { refreshInterval: 2000, dedupingInterval: 500 });
  const { data: details } = useSWR<{ athlete1?: Athlete; athlete2?: Athlete }>(`/matches/${matchId}`, fetcher);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [winnerId, setWinnerId] = useState('');
  const [winMethod, setWinMethod] = useState('POINTS');
  const [clientId, setClientId] = useState('');
  const [leaseState, setLeaseState] = useState<'claiming' | 'owned' | 'blocked'>('claiming');
  const [leaseMessage, setLeaseMessage] = useState('Đang kiểm tra quyền điều khiển bảng điểm…');
  const [leaseAttempt, setLeaseAttempt] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 100); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!confirming && !showHistory) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = root.current?.querySelector<HTMLElement>('[role="dialog"]');
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), select, a[href]') || []);
    focusable()[0]?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busyRef.current) { setConfirming(false); setShowHistory(false); }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, [confirming, showHistory]);
  const clock = board?.resultData?.scoreboard;
  const serverNow = board ? now + Date.parse(board.serverNow) - board.receivedAt : now;
  const remaining = Math.max(0, (clock?.remainingMs ?? (board?.category.matchDurationSeconds || 300) * 1000) - (clock?.runningSince ? serverNow - Date.parse(clock.runningSince) : 0));
  const running = Boolean(clock?.runningSince && remaining > 0);
  const finished = board?.status === 'FINISHED';
  const live = board?.status === 'RUNNING' && board?.resultStatus === 'DRAFT';
  const actions = clock?.actions || [];
  const terminal = board?.proposedWinMethod === 'SUBMISSION' || board?.proposedWinMethod === 'DISQUALIFICATION';
  const canConfirmResult = terminal || remaining === 0;
  const athletes = [details?.athlete1, details?.athlete2];
  const returnTo = board ? `/cms/events/${board.eventId}?tab=matches` : '/cms/matches';

  useEffect(() => {
    setClientId(typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}-${Math.random()}`);
  }, []);

  useEffect(() => {
    if (!board?.id || board.status === 'FINISHED' || !clientId) return;
    let active = true;
    const leaseUrl = `/results/matches/${board.id}/scoreboard`;
    setLeaseState('claiming');
    setLeaseMessage('Đang kiểm tra quyền điều khiển bảng điểm…');
    api.post(`${leaseUrl}/claim`, { clientId }).then(() => {
      if (active) setLeaseState('owned');
    }).catch((err: any) => {
      if (!active) return;
      setLeaseState('blocked');
      setLeaseMessage(err.response?.data?.message || 'Bảng điểm đang được điều khiển ở tab hoặc thiết bị khác. Bạn chỉ có thể xem.');
    });
    const heartbeat = window.setInterval(() => {
      api.post(`${leaseUrl}/heartbeat`, { clientId }).catch((err: any) => {
        if (!active) return;
        setLeaseState('blocked');
        setLeaseMessage(err.response?.data?.message || 'Mất quyền điều khiển bảng điểm. Các thao tác đã bị khóa.');
      });
    }, 5000);
    const releaseOnClose = () => {
      const token = getAuthToken();
      if (!token) return;
      void fetch(`/api${leaseUrl}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ clientId }),
        keepalive: true,
      });
    };
    window.addEventListener('pagehide', releaseOnClose);
    return () => {
      active = false;
      window.clearInterval(heartbeat);
      window.removeEventListener('pagehide', releaseOnClose);
    };
  }, [board?.id, board?.status, clientId, leaseAttempt]);

  useEffect(() => {
    if (!live || (board.proposedWinMethod !== 'SUBMISSION' && board.proposedWinMethod !== 'DISQUALIFICATION')) return;
    setWinnerId(board.proposedWinnerId || '');
    setWinMethod(board.proposedWinMethod);
    setShowControls(true);
    setConfirming(true);
  }, [live, board?.proposedWinnerId, board?.proposedWinMethod]);

  async function command(input: Command) {
    if (!board || busyRef.current || loadError) return false;
    if (leaseState !== 'owned' || !clientId) { setError('Tab này không giữ quyền điều khiển bảng điểm.'); return false; }
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await api.post<Board>(endpoint, { ...input, expectedVersion: board.resultVersion, clientId }, { timeout: 10000 });
      await mutate(stampBoard(response.data), { revalidate: false });
      if (input.action === 'FINISH' || input.action === 'START') {
        await refreshCache((key) => typeof key === 'string' && (key.startsWith('/matches') || key.startsWith('/events/') || key.startsWith('/results/matches/') && key !== endpoint)).catch(() => undefined);
      }
      return true;
    } catch (err: any) {
      const message = err.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || 'Chưa xác nhận được thao tác. Kiểm tra bảng điểm sau khi tải lại trước khi thử lại.');
      await mutate().catch(() => undefined);
      return false;
    } finally { busyRef.current = false; setBusy(false); }
  }

  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await root.current?.requestFullscreen();
    } catch { setError('Trình duyệt không hỗ trợ toàn màn hình. Bạn có thể dùng phím F11.'); }
  }

  if (!board) return <div className={styles.loading}><p>{loadError ? 'Không thể mở bảng điểm hoặc bạn chưa có quyền chấm điểm.' : 'Đang tải bảng điểm…'}</p><button onClick={() => mutate()}>Thử lại</button><Link href="/cms/matches">Quay lại</Link></div>;
  const disabled = busy || Boolean(loadError) || leaseState !== 'owned';
  return (
    <div ref={root} className={styles.board}>
      <button className={styles.controlsToggle} type="button" aria-expanded={showControls} aria-controls="scoreboard-controls" onClick={() => setShowControls(!showControls)}>Điều khiển</button>
      {(error || loadError || board.blockedReason || leaseState !== 'owned') && <div role="alert" className={styles.notice}>{error || (loadError ? 'Mất kết nối. Các nút điều khiển tạm khóa; đồng hồ vẫn theo thời gian đã lưu.' : board.blockedReason || leaseMessage)}<button aria-label={leaseState === 'blocked' ? 'Thử lấy quyền điều khiển lại' : 'Tải lại'} onClick={() => { void mutate(); if (leaseState === 'blocked') setLeaseAttempt((attempt) => attempt + 1); }}><RefreshCw size={16} /></button></div>}
      <main className={styles.rows}>
        {([1, 2] as const).map((side) => <ScoreboardAthleteRow
          key={side}
          side={side}
          athleteName={athletes[side - 1]?.fullName || 'Chờ xác định'}
          score={board[`athlete${side}Score`]}
          penalties={board[`athlete${side}Penalties`]}
          advantages={board[`athlete${side}Advantages`]}
          submissionAwarded={actions.some((action) => action.side === side && action.award === 'SUBMISSION' && !action.undone)}
          disabled={disabled || !live || terminal}
          onSubmission={() => command({ action: 'AWARD', side, award: 'SUBMISSION' })}
          onAdvantage={() => command({ action: 'AWARD', side, award: 'ADVANTAGE' })}
          onPenalty={(penaltyLevel) => command({ action: 'AWARD', side, award: 'PENALTY', penaltyLevel })}
          onPoints={(points) => command({ action: 'AWARD', side, award: 'POINTS', points })}
        />)}
      </main>
      <footer className={styles.footer}>
        <div className={styles.clock} role="timer" aria-label="Thời gian còn lại"><span>{timeLabel(remaining).split(':')[0]}</span>{' '}<span>:</span>{' '}<span>{timeLabel(remaining).split(':')[1]}</span></div>
      </footer>
      {showControls && <aside id="scoreboard-controls" className={styles.controlPanel} aria-label="Điều khiển trận đấu">
        <div className={styles.panelHeading}><Link href={returnTo} className={styles.back}><ArrowLeft size={18} /> Lịch đấu</Link><button aria-label="Đóng điều khiển" onClick={() => setShowControls(false)}><X size={18} /></button></div>
        <strong>{board.event.name}</strong>
        <p>{board.category.name} · Trận #{board.matchNumber || '—'} · {board.fop || 'Chưa xếp sân'}</p>
        <p className={styles.status}>{finished ? 'ĐÃ KẾT THÚC' : live ? running ? 'ĐANG THI ĐẤU' : 'TẠM DỪNG' : 'CHƯA BẮT ĐẦU'}</p>
        {([1, 2] as const).map((side) => <div key={side} className={styles.athleteSummary}>
          <strong>{side === 1 ? 'Đỏ' : 'Xanh'}: {athletes[side - 1]?.fullName || 'Chờ xác định'}</strong>
          <span>Phạt: {board[`athlete${side}Penalties`]} · Lợi thế: {board[`athlete${side}Advantages`]}</span>
          <button disabled={disabled || !live || terminal} onClick={() => command({ action: 'AWARD', side, award: 'ADVANTAGE' })}>+ Lợi thế {side === 1 ? 'Đỏ' : 'Xanh'}</button>
          <button disabled={disabled || !live || terminal} onClick={() => command({ action: 'AWARD', side, award: 'ATTACK' })}>+ Chủ động tấn công {side === 1 ? 'Đỏ' : 'Xanh'}</button>
          <span>Chủ động tấn công: {actions.filter((action) => !action.undone && action.side === side && action.award === 'ATTACK').length}</span>
          {finished && board.winnerId === athletes[side - 1]?.id && <strong className={styles.winner}>CHIẾN THẮNG</strong>}
        </div>)}
        <div className={styles.tools}><button disabled={disabled || !live || !actions.some((action) => !action.undone)} onClick={() => command({ action: 'UNDO' })}><Undo2 size={18} /> Hoàn tác</button><button onClick={() => setShowHistory(true)}><History size={18} /> Lịch sử ({actions.length})</button><button aria-label="Toàn màn hình" onClick={fullscreen}><Expand size={18} /> Toàn màn hình</button></div>
        <div className={styles.controls}>
          {board.status === 'SCHEDULED' && <button className={styles.primary} disabled={disabled || Boolean(board.blockedReason)} onClick={async () => { if (await command({ action: 'START' })) setShowControls(false); }}><Play size={20} /> Bắt đầu trận</button>}
          {live && <><button className={styles.primary} disabled={disabled || terminal && !clock?.runningSince || remaining === 0 && !clock?.runningSince} onClick={() => command({ action: clock?.runningSince ? 'PAUSE' : 'RESUME' })}>{running ? <Pause size={20} /> : <Play size={20} />}{clock?.runningSince ? 'Tạm dừng' : 'Tiếp tục'}</button>{canConfirmResult && <button disabled={disabled || running} onClick={() => { setWinnerId(board.proposedWinnerId || ''); setWinMethod(board.proposedWinMethod || 'DECISION'); setConfirming(true); }}><Check size={20} /> Xác nhận kết quả{board.proposedWinnerId ? ` · ${athletes[board.proposedWinnerId === board.athlete1Id ? 0 : 1]?.fullName || 'VĐV thắng'}` : ''}</button>}</>}
          {live && canConfirmResult && board.proposedWinnerId && <small>{board.outcomeReason}. Kiểm tra rồi xác nhận để lưu kết quả.</small>}
          <small>{busy ? 'Đang lưu…' : `Đã đồng bộ · v${board.resultVersion}`}</small>
          <small>{finished ? board.resultStatus === 'ENTERED' ? 'Đã lưu · Chờ trọng tài xác nhận' : 'Kết quả đã lưu' : remaining === 0 ? 'HẾT GIỜ · Chờ xác nhận kết quả' : running ? 'Đồng hồ đang chạy' : 'Đồng hồ đã dừng'}</small>
        </div>
      </aside>}
      {confirming && <div className={styles.overlay}><section role="dialog" aria-modal="true" aria-labelledby="result-title" className={styles.dialog}>
        <h2 id="result-title">Xác nhận kết quả trận đấu</h2><p>{athletes[0]?.fullName}: <b>{board.athlete1Score}</b> — {athletes[1]?.fullName}: <b>{board.athlete2Score}</b></p>
        {board.outcomeReason && <p><b>{athletes[board.proposedWinnerId === board.athlete1Id ? 0 : 1]?.fullName}</b> thắng theo bảng điểm: {board.outcomeReason}.</p>}
        <label>Vận động viên thắng<select value={winnerId} onChange={(event) => setWinnerId(event.target.value)}><option value="">Chọn theo quyết định trọng tài</option>{athletes.filter(Boolean).map((athlete) => <option key={athlete.id} value={athlete.id}>{athlete.fullName}</option>)}</select></label>
        <label>Phương thức thắng<select value={winMethod} onChange={(event) => setWinMethod(event.target.value)}>{methods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <p>Kết quả được lưu và VĐV được điền vào nhánh đấu đã cấu hình. Trận kế tiếp cần được bắt đầu thủ công.</p>
        {error && <p role="alert" className={styles.dialogError}>{error}</p>}
        <div className={styles.dialogButtons}><button disabled={busy} onClick={() => setConfirming(false)}>Quay lại</button><button className={styles.primary} disabled={disabled || !winnerId || running} onClick={async () => { if (await command({ action: 'FINISH', winnerId, winMethod })) setConfirming(false); }}>Xác nhận & lưu kết quả</button></div>
      </section></div>}
      {showHistory && <div className={styles.overlay}><section role="dialog" aria-modal="true" aria-labelledby="history-title" className={styles.dialog}><div className={styles.dialogButtons}><h2 id="history-title">Thao tác trọng tài</h2><button aria-label="Đóng lịch sử" onClick={() => setShowHistory(false)}><X size={20} /></button></div><ol className={styles.history}>{[...actions].reverse().map((action) => <li key={action.id} className={action.undone ? styles.undone : ''}><b>{timeLabel(action.remainingMs)}</b> · {athletes[action.side - 1]?.fullName}: {awardLabels[action.award]} {action.award === 'POINTS' ? `+${action.points}` : action.penaltyLevel ? `${action.penaltyLevel}P` : ''}{action.undone ? ' (đã hoàn tác)' : ''}</li>)}</ol>{!actions.length && <p>Chưa có thao tác chấm điểm.</p>}</section></div>}
    </div>
  );
}
