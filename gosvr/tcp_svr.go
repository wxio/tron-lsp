package main

import (
	"context"
	"log"
	"net"
	"os"

	"github.com/golangq/q"
	"golang.org/x/tools/jsonrpc2"
	"golang.org/x/tools/lsp/protocol"
)

// const addr = "localhost:8080"

func tcpSvr() {
	lst, err := net.Listen("tcp", addr)
	if err != nil {
		q.Q("failed to listen: %v", err)
		log.Fatalf("failed to listen: %v", err)
	}
	defer lst.Close()
	//
	for {
		conn, err := lst.Accept()
		if err != nil {
			q.Q(err)
			os.Exit(1)
		}
		go handle(conn)
	}
}

func handle(conn net.Conn) {
	q.Q("setting up stream")
	stream := jsonrpc2.NewHeaderStream(conn, conn)
	ctx, cancel := context.WithCancel(context.Background())
	srv := &server{
		tcpConn: conn,
		cancel:  cancel,
	}
	connLSP, client, _ := protocol.NewServer(stream, srv)
	srv.client = client
	srv.conn = connLSP
	q.Q(connLSP.Run(ctx))
	cancel()
	conn.Close()
}
