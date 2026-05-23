package worker

import (
	"context"
	"log"
	"sync"
)

type Job struct {
	ID     string
	Type   string
	Target string
	Tools  []string
}

type Queue struct {
	jobs    chan Job
	wg      sync.WaitGroup
	workers int
	handler func(context.Context, Job)
	cancels sync.Map // scanID -> context.CancelFunc
}

func NewQueue(workers int, handler func(context.Context, Job)) *Queue {
	return &Queue{
		jobs:    make(chan Job, 100),
		workers: workers,
		handler: handler,
	}
}

func (q *Queue) Start() {
	for i := 0; i < q.workers; i++ {
		go q.worker()
	}
	log.Printf("[worker] started %d workers", q.workers)
}

func (q *Queue) Enqueue(job Job) {
	q.jobs <- job
	log.Printf("[worker] enqueued job %s target=%s", job.ID, job.Target)
}

func (q *Queue) Cancel(id string) {
	if v, ok := q.cancels.LoadAndDelete(id); ok {
		v.(context.CancelFunc)()
		log.Printf("[worker] cancelled job %s", id)
	}
}

func (q *Queue) worker() {
	for job := range q.jobs {
		ctx, cancel := context.WithCancel(context.Background())
		q.cancels.Store(job.ID, cancel)
		q.wg.Add(1)
		q.handler(ctx, job)
		q.cancels.Delete(job.ID)
		cancel()
		q.wg.Done()
	}
}

func (q *Queue) Wait() {
	q.wg.Wait()
}
