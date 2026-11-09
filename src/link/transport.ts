export type LinkMode = "tabs" | "devices";
export type LinkMessage = { event: string; payload: unknown };
export type RoomTransport = { send: (event: string, payload: unknown) => void; close: () => void };

/** No network or credentials on the local path. Close before an async cloud import can finish. */
export function openRoom(room: string, mode: LinkMode, receive: (m: LinkMessage) => void, online: (v: boolean) => void): RoomTransport {
  let closed = false;
  let send: RoomTransport["send"] = () => {};
  let dispose = () => {};
  if (mode === "tabs") {
    const channel = new BroadcastChannel(`nad-local-room-${room}`);
    channel.onmessage = e => receive(e.data);
    send = (event, payload) => channel.postMessage({ event, payload });
    dispose = () => channel.close();
    online(true);
  } else {
    void import("@/integrations/supabase/client").then(({ supabase }) => {
      if (closed) return;
      const channel = supabase.channel(`nad-room-${room}`, { config: { broadcast: { self: false } } });
      ["mix", "deck", "start", "stop", "ping", "pong", "ctl"].forEach(event => channel.on("broadcast", { event }, ({ payload }) => receive({ event, payload })));
      channel.subscribe(status => online(status === "SUBSCRIBED"));
      send = (event, payload) => { void channel.send({ type: "broadcast", event, payload }); };
      dispose = () => { void supabase.removeChannel(channel); };
    }).catch(() => { if (!closed) online(false); });
  }
  return { send: (event, payload) => { if (!closed) send(event, payload); }, close: () => { closed = true; dispose(); } };
}