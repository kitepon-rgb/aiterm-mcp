# tmux 3.7b `paste-buffer` source (verbatim excerpt)

- Source: https://raw.githubusercontent.com/tmux/tmux/3.7b/cmd-paste-buffer.c
- Retrieved: 2026-07-14
- Method: `markitdown` (3453 bytes; non-empty)
- Confidence: primary source / high

```c
const struct cmd_entry cmd_paste_buffer_entry = {
	.name = "paste-buffer",
	.alias = "pasteb",

	.args = { "db:prSs:t:", 0, 0, NULL },
	.usage = "[-dprS] [-s separator] " CMD_BUFFER_USAGE " "
		 CMD_TARGET_PANE_USAGE,

	.target = { 't', CMD_FIND_PANE, 0 },

	.flags = CMD_AFTERHOOK,
	.exec = cmd_paste_buffer_exec
};
```

```c
static void
cmd_paste_buffer_paste(struct window_pane *wp, const char *buf, size_t len)
{
	char	*cp;
	size_t	 n;

	n = utf8_stravisx(&cp, buf, len, VIS_SAFE|VIS_NOSLASH);
	bufferevent_write(wp->event, cp, n);
	free(cp);
}
```

```c
			len = line - bufdata;
			if (args_has(args, 'S'))
				bufferevent_write(wp->event, bufdata, len);
			else
				cmd_paste_buffer_paste(wp, bufdata, len);
			bufferevent_write(wp->event, sepstr, seplen);
```
