package main

import (
	"log"
	"net"
	"net/http"

	"github.com/golangq/q"
	"golang.org/x/tools/jsonrpc2"
	"golang.org/x/tools/lsp/protocol"
	"nhooyr.io/websocket"
)

const addr = "localhost:8080"

func run() {
	lst, err := net.Listen("tcp", addr)
	if err != nil {
		q.Q("failed to listen: %v", err)
		log.Fatalf("failed to listen: %v", err)
	}
	defer lst.Close()
	//
	svr := &http.Server{
		Handler: http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
			err := lspServer(rw, req)
			if err != nil {
				q.Q("lsp server: %v", err)
			}
		}),
		// ReadTimeout:  time.Second * 15,
		// WriteTimeout: time.Second * 15,
	}
	defer svr.Close()
	//
	err = svr.Serve(lst)
	if err != http.ErrServerClosed {
		q.Q("failed to listen and serve: %v", err)
		log.Fatalf("failed to listen and serve: %v", err)
	}
}

func lspServer(rw http.ResponseWriter, req *http.Request) error {
	q.Q("serving %v", req.RemoteAddr)
	con, err := websocket.Accept(rw, req, websocket.AcceptOptions{
		// Subprotocols: []string{"echo"},
	})
	q.Q("accepted")
	if err != nil {
		q.Q(err)
		return err
	}
	defer con.Close(websocket.StatusInternalError, "the sky is falling")

	// if c.Subprotocol() != "echo" {
	// 	c.Close(websocket.StatusPolicyViolation, "client must speak the echo subprotocol")
	// 	return xerrors.Errorf("client does not speak echo sub protocol")
	// }

	ctx := req.Context()
	// ctx, cancel := context.WithTimeout(ctx, time.Second*10)
	// defer cancel()
	typ, rdr, err := con.Reader(ctx)
	if err != nil {
		q.Q(err)
		return err
	}
	wtr, err := con.Writer(ctx, typ)
	if err != nil {
		q.Q(err)
		return err
	}
	q.Q("setting up stream")
	stream := jsonrpc2.NewHeaderStream(rdr, wtr)
	srv := &server{}
	connLSP, _, _ := protocol.NewServer(stream, srv)
	q.Q(connLSP.Run(ctx))
	err = wtr.Close()
	q.Q(err)
	return err
}
