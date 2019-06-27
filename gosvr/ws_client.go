package main

import (
	"context"
	"io"
	"os"

	"nhooyr.io/websocket"
)

func client() error {
	url := "ws://" + addr
	ctx := context.Background()
	con, _, err := websocket.Dial(ctx, url, websocket.DialOptions{
		// Subprotocols: []string{"echo"},
	})
	if err != nil {
		return err
	}
	defer con.Close(websocket.StatusInternalError, "the sky is falling")

	errChan := make(chan error, 2)
	go func() {
		wrt, err := con.Writer(ctx, websocket.MessageText)
		if err != nil {
			errChan <- err
		}
		_, err = io.Copy(wrt, os.Stdin)
		errChan <- err
	}()
	go func() {
		_, rdr, err := con.Reader(ctx)
		if err != nil {
			errChan <- err
		}
		_, err = io.Copy(os.Stdout, rdr)
		errChan <- err
	}()
	err = <-errChan
	con.Close(websocket.StatusNormalClosure, "")
	return err
}
