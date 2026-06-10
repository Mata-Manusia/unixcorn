package api

import (
	"context"
	"sync"
)

// SessionJob stores all SSE events for an in-progress agent session.
// Clients subscribe via Watch() — reads from the event slice, never drops events.
// Agent runs in a background goroutine and calls Publish().
type SessionJob struct {
	mu     sync.Mutex
	events []SSEEvent
	done   bool
	wake   chan struct{} // cap-1 nudge channel; non-blocking send
	cancel context.CancelFunc
	ctx    context.Context
}

func newSessionJobObj() *SessionJob {
	ctx, cancel := context.WithCancel(context.Background())
	return &SessionJob{
		wake:   make(chan struct{}, 1),
		ctx:    ctx,
		cancel: cancel,
	}
}

func (j *SessionJob) Publish(ev SSEEvent) {
	j.mu.Lock()
	j.events = append(j.events, ev)
	if ev.Type == "done" {
		j.done = true
	}
	j.mu.Unlock()
	// Non-blocking nudge: if already signalled, drop — watcher will drain all events anyway
	select {
	case j.wake <- struct{}{}:
	default:
	}
}

func (j *SessionJob) IsActive() bool {
	j.mu.Lock()
	defer j.mu.Unlock()
	return !j.done
}

// Stop cancels the agent goroutine context, causing runAgent to exit after current iteration.
func (j *SessionJob) Stop() {
	j.cancel()
}

// Context returns the job's cancellable context for use by runAgent.
func (j *SessionJob) Context() context.Context {
	return j.ctx
}

// Watch streams all events to emit, starting from index `from`.
// Blocks until done event received or ctx cancelled — never drops events.
func (j *SessionJob) Watch(ctx context.Context, from int, emit func(SSEEvent)) {
	for {
		j.mu.Lock()
		batch := j.events[from:]
		total := len(j.events)
		isDone := j.done
		j.mu.Unlock()

		for _, ev := range batch {
			emit(ev)
			from++
			if ev.Type == "done" {
				return
			}
		}

		if isDone && from >= total {
			return
		}

		select {
		case <-j.wake:
		case <-ctx.Done():
			return
		}
	}
}

// ---- global registry ----

var (
	sessionJobs   = make(map[int64]*SessionJob)
	sessionJobsMu sync.RWMutex
)

func newJob(sessionID int64) *SessionJob {
	sessionJobsMu.Lock()
	defer sessionJobsMu.Unlock()
	j := newSessionJobObj()
	sessionJobs[sessionID] = j
	return j
}

func getJob(sessionID int64) *SessionJob {
	sessionJobsMu.RLock()
	j := sessionJobs[sessionID]
	sessionJobsMu.RUnlock()
	if j == nil || !j.IsActive() {
		return nil
	}
	return j
}

func deleteJob(sessionID int64) {
	sessionJobsMu.Lock()
	delete(sessionJobs, sessionID)
	sessionJobsMu.Unlock()
}
