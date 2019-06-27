package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"time"

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
	conn, err := lst.Accept()
	if err != nil {
		q.Q(err)
		os.Exit(1)
	}
	q.Q("setting up stream")
	stream := jsonrpc2.NewHeaderStream(conn, conn)
	srv := &server{}
	connLSP, client, _ := protocol.NewServer(stream, srv)
	srv.client = client
	srv.conn = connLSP
	ctx := context.Background()
	go func() {
		<-time.After(2 * time.Second)
		connLSP.Notify(ctx, "window/showMessage", protocol.ShowMessageParams{
			Message: "hello from tronlsp",
			Type:    protocol.Info,
		})
	}()
	go func() {
		<-time.After(2 * time.Second)
		for {
			connLSP.Notify(ctx, "window/logMessage", protocol.LogMessageParams{
				Message: fmt.Sprintf("hello from tronlsp %v", time.Now()),
				Type:    protocol.Info,
			})
			<-time.After(10 * time.Second)
		}
	}()
	// go func() {
	// 	<-time.After(2 * time.Second)
	// 	var result interface{}
	// 	connLSP.Call(ctx, "workspace/configuration", protocol.ConfigurationParams{
	// 		Items: []protocol.ConfigurationItem{
	// 			{ScopeURI: "", Section: "go"},
	// 		},
	// 	},
	// 		result,
	// 	)
	// 	q.Q("config", result)
	// }()

	q.Q(connLSP.Run(ctx))

}
