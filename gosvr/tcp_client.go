package main

import (
	"io"
	"net"
	"os"
)

func tcpclient() error {
	con, err := net.Dial("tcp", addr)
	if err != nil {
		return err
	}
	errChan := make(chan error, 2)
	go func() {
		_, err = io.Copy(con, os.Stdin)
		errChan <- err
	}()
	go func() {
		_, err = io.Copy(os.Stdout, con)
		errChan <- err
	}()
	err = <-errChan
	return err
}
