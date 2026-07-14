# tmux 3.4 `paste-buffer` source (verbatim excerpt)

- Source: https://raw.githubusercontent.com/tmux/tmux/3.4/cmd-paste-buffer.c
- Retrieved: 2026-07-14
- Method: `markitdown` (3024 bytes; non-empty)
- Confidence: primary source / high

```c
const struct cmd_entry cmd_paste_buffer_entry = {
	.name = "paste-buffer",
	.alias = "pasteb",

	.args = { "db:prs:t:", 0, 0, NULL },
	.usage = "[-dpr] [-s separator] " CMD_BUFFER_USAGE " "
		 CMD_TARGET_PANE_USAGE,

	.target = { 't', CMD_FIND_PANE, 0 },

	.flags = CMD_AFTERHOOK,
	.exec = cmd_paste_buffer_exec
};
```

```c
		sepstr = args_get(args, 's');
		if (sepstr == NULL) {
			if (args_has(args, 'r'))
				sepstr = "\n";
			else
				sepstr = "\r";
		}
		seplen = strlen(sepstr);

		if (bracket && (wp->screen->mode & MODE_BRACKETPASTE))
			bufferevent_write(wp->event, "\033[200~", 6);

		bufdata = paste_buffer_data(pb, &bufsize);
		bufend = bufdata + bufsize;

		for (;;) {
			line = memchr(bufdata, '\n', bufend - bufdata);
			if (line == NULL)
				break;

			bufferevent_write(wp->event, bufdata, line - bufdata);
			bufferevent_write(wp->event, sepstr, seplen);

			bufdata = line + 1;
		}
		if (bufdata != bufend)
			bufferevent_write(wp->event, bufdata, bufend - bufdata);
```
