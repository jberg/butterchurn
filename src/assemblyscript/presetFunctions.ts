@external("resetPool", "warp")
declare let warp: f64;
@external("resetPool", "zoom")
declare let zoom: f64;
@external("resetPool", "zoomexp")
declare let zoomexp: f64;
@external("resetPool", "cx")
declare let cx: f64;
@external("resetPool", "cy")
declare let cy: f64;
@external("resetPool", "sx")
declare let sx: f64;
@external("resetPool", "cy")
declare let sy: f64;
@external("resetPool", "dx")
declare let dx: f64;
@external("resetPool", "dy")
declare let dy: f64;
@external("resetPool", "rot")
declare let rot: f64;

let warp_save: f64;
let zoom_save: f64;
let zoomexp_save: f64;
let cx_save: f64;
let cy_save: f64;
let sx_save: f64;
let sy_save: f64;
let dx_save: f64;
let dy_save: f64;
let rot_save: f64;

export function save(): void {
  warp_save = warp;
  zoom_save = zoom;
  zoomexp_save = zoomexp;
  cx_save = cx;
  cy_save = cy;
  sx_save = sx;
  sy_save = sy;
  dx_save = dx;
  dy_save = dy;
  rot_save = rot;
}

export function restore(): void {
  warp = warp_save;
  zoom = zoom_save;
  zoomexp = zoomexp_save;
  cx = cx_save;
  cy = cy_save;
  sx = sx_save;
  sy = sy_save;
  dx = dx_save;
  dy = dy_save;
  rot = rot_save;
}
