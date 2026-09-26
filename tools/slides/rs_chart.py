from vis_core import *
def chart(f, x0, y0, w, h, series, xlim, ylim, xlab="", ylab="", xt=None, yt=None, legend=True, lx=None, ly=None, bands=None, log=False):
    """Line chart. series = [(xs, ys, colour, label, width)] ; bands = [(x1, x2, colour, label)] shaded."""
    X = lambda v: x0 + (math.log10(v) - math.log10(xlim[0])) / (math.log10(xlim[1]) - math.log10(xlim[0])) * w if log else x0 + (v - xlim[0]) / (xlim[1] - xlim[0]) * w
    Y = lambda v: y0 + h - (v - ylim[0]) / (ylim[1] - ylim[0]) * h
    f.rect(x0, y0, w, h, "#fff", "#cfd8dc", .8)
    for (a, b, c, l) in (bands or []):
        f.rect(X(a), y0, max(1.5, X(b) - X(a)), h, c, extra='opacity=".28"')
        if l: f.text((X(a) + X(b)) / 2, y0 + 14, l, 11, INK, "middle")
    for v in (xt or []): f.line(X(v), y0 + h, X(v), y0 + h + 5, INK, .8); f.text(X(v), y0 + h + 20, kh(v) if isinstance(v, int) else kh(v), 12, "#546e7a", "middle")
    for v in (yt or []): f.line(x0, Y(v), x0 + w, Y(v), "#eceff1", .8); f.text(x0 - 6, Y(v) + 4, kh(v), 12, "#546e7a", "end")
    for i, (xs, ys, c, l, sw) in enumerate(series):
        pts = [(X(a), Y(b)) for a, b in zip(xs, ys) if b is not None]
        f.path("M" + " L".join(f"{p:.1f} {q:.1f}" for p, q in pts), "none", c, sw)
        if legend and l:
            yy = (ly or y0 + 10) + i * 22; xx = lx or x0 + w + 14; f.line(xx, yy, xx + 22, yy, c, 3); f.text(xx + 28, yy + 5, l, 13)
    if xlab: f.text(x0 + w / 2, y0 + h + 42, xlab, 14, INK, "middle")
    if ylab: f.text(x0 - 46, y0 + h / 2, ylab, 14, INK, "middle", extra=f'transform="rotate(-90 {x0-46} {y0+h/2})"')
    return X, Y
def bars(f, x0, y0, w, h, labels, vals, cols, vmax=None, fmt=lambda v: kh(v), horizontal=True, lw=170):
    vmax = vmax or max(vals); n = len(vals)
    for i, (l, v, c) in enumerate(zip(labels, vals, cols)):
        if horizontal:
            bh = h / n * .7; y = y0 + i * h / n; L = (w - lw) * v / vmax
            f.text(x0 + lw - 10, y + bh / 2 + 5, l, 14, INK, "end"); f.rect(x0 + lw, y, L, bh, c); f.text(x0 + lw + L + 6, y + bh / 2 + 5, fmt(v), 13)
        else:
            bw = w / n * .7; x = x0 + i * w / n; H = h * v / vmax
            f.rect(x, y0 + h - H, bw, H, c); f.text(x + bw / 2, y0 + h - H - 6, fmt(v), 12, INK, "middle"); f.text(x + bw / 2, y0 + h + 18, l, 12, INK, "middle")
