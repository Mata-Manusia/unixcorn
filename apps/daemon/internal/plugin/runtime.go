package plugin

import (
	"bufio"
	"context"
	"log"
	"os/exec"
)

type OutputLine struct {
	ScanID  string
	Tool    string
	Line    string
	IsError bool
}

type Runtime struct {
	OnOutput func(OutputLine)
}

func NewRuntime(onOutput func(OutputLine)) *Runtime {
	return &Runtime{OnOutput: onOutput}
}

func (r *Runtime) Run(scanID, tool string, args []string) error {
	return r.RunContext(context.Background(), scanID, tool, args)
}

func (r *Runtime) RunContext(ctx context.Context, scanID, tool string, args []string) error {
	cmd := exec.CommandContext(ctx, tool, args...)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}

	if err := cmd.Start(); err != nil {
		return err
	}

	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			r.OnOutput(OutputLine{ScanID: scanID, Tool: tool, Line: scanner.Text()})
		}
	}()

	go func() {
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			r.OnOutput(OutputLine{ScanID: scanID, Tool: tool, Line: scanner.Text(), IsError: true})
		}
	}()

	if err := cmd.Wait(); err != nil {
		log.Printf("[plugin] %s exited: %v", tool, err)
	}

	return nil
}
