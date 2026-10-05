const NS = "http://www.w3.org/2000/svg";
function element(tag, attributes = {}, text) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attributes))
    node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  return node;
}
export function lineChart(
  container,
  {
    series,
    title,
    xFormat = String,
    yFormat = (v) => v.toFixed(0),
    reference = null,
    markers = [],
  },
) {
  const width = Math.max(320, container.clientWidth || 960),
    height = width < 500 ? 260 : 300,
    pad = { left: 58, right: 24, top: 20, bottom: 42 };
  const points = series
    .flatMap((s) => s.points)
    .filter((p) => Number.isFinite(p.y) && Number.isFinite(p.x));
  container.replaceChildren();
  if (!points.length) {
    const p = document.createElement("p");
    p.className = "chart-empty";
    p.textContent =
      "No observations in this window. Missing values are not filled.";
    container.append(p);
    return;
  }
  let xmin = Math.min(...points.map((p) => p.x)),
    xmax = Math.max(...points.map((p) => p.x));
  if (xmin === xmax) xmax = xmin + 1;
  let ymin = Math.min(...points.map((p) => p.y)),
    ymax = Math.max(...points.map((p) => p.y));
  if (reference !== null) {
    ymin = Math.min(ymin, reference);
    ymax = Math.max(ymax, reference);
  }
  const span = ymax - ymin || 1;
  ymin -= span * 0.09;
  ymax += span * 0.09;
  const x = (v) =>
      pad.left + ((v - xmin) / (xmax - xmin)) * (width - pad.left - pad.right),
    y = (v) =>
      height -
      pad.bottom -
      ((v - ymin) / (ymax - ymin)) * (height - pad.top - pad.bottom);
  const svg = element("svg", {
    viewBox: "0 0 " + width + " " + height,
    role: "img",
    "aria-label": title,
  });
  svg.append(element("title", {}, title));
  for (let i = 0; i <= 4; i++) {
    const v = ymin + ((ymax - ymin) * i) / 4;
    svg.append(
      element("line", {
        x1: pad.left,
        x2: width - pad.right,
        y1: y(v),
        y2: y(v),
        class: "grid-line",
      }),
    );
    svg.append(
      element(
        "text",
        {
          x: pad.left - 12,
          y: y(v) + 4,
          "text-anchor": "end",
          class: "axis-label",
        },
        yFormat(v),
      ),
    );
  }
  const ticks = width < 500 ? 3 : 6;
  for (let i = 0; i <= ticks; i++) {
    const v = xmin + ((xmax - xmin) * i) / ticks;
    svg.append(
      element(
        "text",
        {
          x: x(v),
          y: height - 15,
          "text-anchor": "middle",
          class: "axis-label",
        },
        xFormat(v),
      ),
    );
  }
  if (reference !== null)
    svg.append(
      element("line", {
        x1: pad.left,
        x2: width - pad.right,
        y1: y(reference),
        y2: y(reference),
        class: "reference-line",
      }),
    );
  for (const marker of markers) {
    if (marker.x < xmin || marker.x > xmax) continue;
    svg.append(
      element("line", {
        x1: x(marker.x),
        x2: x(marker.x),
        y1: pad.top,
        y2: height - pad.bottom,
        class: "marker-line",
      }),
    );
    svg.append(
      element(
        "text",
        { x: x(marker.x) + 5, y: pad.top + 10, class: "marker-label" },
        marker.label,
      ),
    );
  }
  for (const item of series) {
    let path = "",
      previous = null;
    for (const p of item.points) {
      if (!Number.isFinite(p.y)) {
        previous = null;
        continue;
      }
      const contiguous = previous !== null && p.x - previous <= 1.01;
      path +=
        (contiguous ? " L" : " M") +
        x(p.x).toFixed(2) +
        " " +
        y(p.y).toFixed(2);
      previous = p.x;
    }
    svg.append(
      element("path", {
        d: path,
        fill: "none",
        stroke: item.color,
        "stroke-width": 2.4,
        "stroke-linejoin": "round",
        "stroke-linecap": "round",
      }),
    );
  }
  const cursor = element("line", {
    y1: pad.top,
    y2: height - pad.bottom,
    class: "cursor-line",
    visibility: "hidden",
  });
  svg.append(cursor);
  container.append(svg);
  const readout = document.createElement("p");
  readout.className = "chart-readout";
  readout.textContent =
    "Move over the chart to inspect a month. The same records are downloadable in Data & method.";
  container.append(readout);
  const inspect = (fraction) => {
    const target = xmin + Math.max(0, Math.min(1, fraction)) * (xmax - xmin);
    const first = series.find((s) => s.points.length);
    const point = first.points.reduce((a, b) =>
      Math.abs(b.x - target) < Math.abs(a.x - target) ? b : a,
    );
    cursor.setAttribute("x1", x(point.x));
    cursor.setAttribute("x2", x(point.x));
    cursor.setAttribute("visibility", "visible");
    readout.textContent =
      xFormat(point.x) +
      " · " +
      series
        .map((s) => {
          const p = s.points.find((p) => Math.abs(p.x - point.x) < 0.1);
          return (
            s.name +
            ": " +
            (p && Number.isFinite(p.y) ? yFormat(p.y) : "unavailable")
          );
        })
        .join(" · ");
  };
  svg.addEventListener("pointermove", (event) => {
    const rect = svg.getBoundingClientRect();
    inspect(
      (((event.clientX - rect.left) / rect.width) * width - pad.left) /
        (width - pad.left - pad.right),
    );
  });
  svg.addEventListener("pointerleave", () =>
    cursor.setAttribute("visibility", "hidden"),
  );
  const range = document.createElement("input");
  range.type = "range";
  range.min = "0";
  range.max = "1000";
  range.value = "0";
  range.className = "chart-scrubber";
  range.setAttribute("aria-label", "Inspect months in " + title);
  range.addEventListener("input", () => inspect(Number(range.value) / 1000));
  container.append(range);
}
