@external("console", "logf")
declare function logf(val: f64): void;
@external("console", "logi")
declare function logi(val: i32): void;

export function createFloat32Array(length: i32): Float32Array {
  return new Float32Array(length);
}

// Reset pixel eq vars

@external("pixelVarPool", "warp")
declare let warp: f64;
@external("pixelVarPool", "zoom")
declare let zoom: f64;
@external("pixelVarPool", "zoomexp")
declare let zoomexp: f64;
@external("pixelVarPool", "cx")
declare let cx: f64;
@external("pixelVarPool", "cy")
declare let cy: f64;
@external("pixelVarPool", "sx")
declare let sx: f64;
@external("pixelVarPool", "sy")
declare let sy: f64;
@external("pixelVarPool", "dx")
declare let dx: f64;
@external("pixelVarPool", "dy")
declare let dy: f64;
@external("pixelVarPool", "rot")
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

function save(): void {
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

function restore(): void {
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

@external("pixelVarPool", "x")
declare let x: f64;
@external("pixelVarPool", "y")
declare let y: f64;
@external("pixelVarPool", "ang")
declare let ang: f64;
@external("pixelVarPool", "rad")
declare let rad: f64;

@external("pixelEqs", "perPixelEqs")
declare function perPixelEqs(): void;

function atan2(x: f64, y: f64): f64 {
  let a: f64 = Math.atan2(x, y);
  if (a < 0) {
    a += 2.0 * Math.PI;
  }
  return a;
}

export function runPixelEquations(
  arr: Float32Array,
  runVertEQs: bool,
  meshWidth: i32,
  meshHeight: i32,
  time: f64,
  warpanimspeed: f64,
  warpscale: f64,
  aspectx: f64,
  aspecty: f64
): void {
  const gridX: i32 = meshWidth;
  const gridZ: i32 = meshHeight;

  const gridX1: i32 = meshWidth + 1;
  const gridZ1: i32 = meshHeight + 1;

  const warpTimeV: f64 = time * warpanimspeed;
  const warpScaleInv: f64 = 1.0 / warpscale;

  const warpf0: f64 = 11.68 + 4.0 * Math.cos(warpTimeV * 1.413 + 10.0);
  const warpf1: f64 = 8.77 + 3.0 * Math.cos(warpTimeV * 1.113 + 7.0);
  const warpf2: f64 = 10.54 + 3.0 * Math.cos(warpTimeV * 1.233 + 3.0);
  const warpf3: f64 = 11.49 + 4.0 * Math.cos(warpTimeV * 0.933 + 5.0);

  let offset: i32 = 0;

  save();

  for (let iz: i32 = 0; iz < gridZ1; iz++) {
    for (let ix: i32 = 0; ix < gridX1; ix++) {
      const x2: f64 = (f64(ix) / f64(gridX)) * 2.0 - 1.0;
      const y2: f64 = (f64(iz) / f64(gridZ)) * 2.0 - 1.0;
      rad = Math.sqrt(
        x2 * x2 * aspectx * aspectx + y2 * y2 * aspecty * aspecty
      );

      if (runVertEQs) {
        if (iz === f64(gridZ) / 2.0 && ix === f64(gridX) / 2.0) {
          ang = 0;
        } else {
          ang = atan2(y2 * aspecty, x2 * aspectx);
        }

        x = x2 * 0.5 * aspectx + 0.5;
        y = y2 * -0.5 * aspecty + 0.5;

        restore();
        perPixelEqs();
      }

      const zoom2V: f64 = zoom ** (zoomexp ** (rad * 2.0 - 1.0));
      const zoom2Inv: f64 = 1.0 / zoom2V;

      let u: f64 = x2 * 0.5 * aspectx * zoom2Inv + 0.5;
      let v: f64 = -y2 * 0.5 * aspecty * zoom2Inv + 0.5;

      u = (u - cx) / sx + cx;
      v = (v - cy) / sy + cy;

      if (warp !== 0) {
        u +=
          warp *
          0.0035 *
          Math.sin(
            warpTimeV * 0.333 + warpScaleInv * (x2 * warpf0 - y2 * warpf3)
          );
        v +=
          warp *
          0.0035 *
          Math.cos(
            warpTimeV * 0.375 - warpScaleInv * (x2 * warpf2 + y2 * warpf1)
          );
        u +=
          warp *
          0.0035 *
          Math.cos(
            warpTimeV * 0.753 - warpScaleInv * (x2 * warpf1 - y2 * warpf2)
          );
        v +=
          warp *
          0.0035 *
          Math.sin(
            warpTimeV * 0.825 + warpScaleInv * (x2 * warpf0 + y2 * warpf3)
          );
      }

      const u2: f64 = u - cx;
      const v2: f64 = v - cy;

      const cosRot: f64 = Math.cos(rot);
      const sinRot: f64 = Math.sin(rot);
      u = u2 * cosRot - v2 * sinRot + cx;
      v = u2 * sinRot + v2 * cosRot + cy;

      u -= dx;
      v -= dy;

      u = (u - 0.5) / aspectx + 0.5;
      v = (v - 0.5) / aspecty + 0.5;

      unchecked((arr[offset] = f32(u)));
      unchecked((arr[offset + 1] = f32(v)));

      offset += 2;
    }
  }
}

// Copy qs to after frame values

@external("qVarPool", "q1")
declare let q1: f64;
@external("qVarPool", "q2")
declare let q2: f64;
@external("qVarPool", "q3")
declare let q3: f64;
@external("qVarPool", "q4")
declare let q4: f64;
@external("qVarPool", "q5")
declare let q5: f64;
@external("qVarPool", "q6")
declare let q6: f64;
@external("qVarPool", "q7")
declare let q7: f64;
@external("qVarPool", "q8")
declare let q8: f64;
@external("qVarPool", "q9")
declare let q9: f64;
@external("qVarPool", "q10")
declare let q10: f64;
@external("qVarPool", "q11")
declare let q11: f64;
@external("qVarPool", "q12")
declare let q12: f64;
@external("qVarPool", "q13")
declare let q13: f64;
@external("qVarPool", "q14")
declare let q14: f64;
@external("qVarPool", "q15")
declare let q15: f64;
@external("qVarPool", "q16")
declare let q16: f64;
@external("qVarPool", "q17")
declare let q17: f64;
@external("qVarPool", "q18")
declare let q18: f64;
@external("qVarPool", "q19")
declare let q19: f64;
@external("qVarPool", "q20")
declare let q20: f64;
@external("qVarPool", "q21")
declare let q21: f64;
@external("qVarPool", "q22")
declare let q22: f64;
@external("qVarPool", "q23")
declare let q23: f64;
@external("qVarPool", "q24")
declare let q24: f64;
@external("qVarPool", "q25")
declare let q25: f64;
@external("qVarPool", "q26")
declare let q26: f64;
@external("qVarPool", "q27")
declare let q27: f64;
@external("qVarPool", "q28")
declare let q28: f64;
@external("qVarPool", "q29")
declare let q29: f64;
@external("qVarPool", "q30")
declare let q30: f64;
@external("qVarPool", "q31")
declare let q31: f64;
@external("qVarPool", "q32")
declare let q32: f64;

let q1_save: f64;
let q2_save: f64;
let q3_save: f64;
let q4_save: f64;
let q5_save: f64;
let q6_save: f64;
let q7_save: f64;
let q8_save: f64;
let q9_save: f64;
let q10_save: f64;
let q11_save: f64;
let q12_save: f64;
let q13_save: f64;
let q14_save: f64;
let q15_save: f64;
let q16_save: f64;
let q17_save: f64;
let q18_save: f64;
let q19_save: f64;
let q20_save: f64;
let q21_save: f64;
let q22_save: f64;
let q23_save: f64;
let q24_save: f64;
let q25_save: f64;
let q26_save: f64;
let q27_save: f64;
let q28_save: f64;
let q29_save: f64;
let q30_save: f64;
let q31_save: f64;
let q32_save: f64;

export function saveQs(): void {
  q1_save = q1;
  q2_save = q2;
  q3_save = q3;
  q4_save = q4;
  q5_save = q5;
  q6_save = q6;
  q7_save = q7;
  q8_save = q8;
  q9_save = q9;
  q10_save = q10;
  q11_save = q11;
  q12_save = q12;
  q13_save = q13;
  q14_save = q14;
  q15_save = q15;
  q16_save = q16;
  q17_save = q17;
  q18_save = q18;
  q19_save = q19;
  q20_save = q20;
  q21_save = q21;
  q22_save = q22;
  q23_save = q23;
  q24_save = q24;
  q25_save = q25;
  q26_save = q26;
  q27_save = q27;
  q28_save = q28;
  q29_save = q29;
  q30_save = q30;
  q31_save = q31;
  q32_save = q32;
}

export function restoreQs(): void {
  q1 = q1_save;
  q2 = q2_save;
  q3 = q3_save;
  q4 = q4_save;
  q5 = q5_save;
  q6 = q6_save;
  q7 = q7_save;
  q8 = q8_save;
  q9 = q9_save;
  q10 = q10_save;
  q11 = q11_save;
  q12 = q12_save;
  q13 = q13_save;
  q14 = q14_save;
  q15 = q15_save;
  q16 = q16_save;
  q17 = q17_save;
  q18 = q18_save;
  q19 = q19_save;
  q20 = q20_save;
  q21 = q21_save;
  q22 = q22_save;
  q23 = q23_save;
  q24 = q24_save;
  q25 = q25_save;
  q26 = q26_save;
  q27 = q27_save;
  q28 = q28_save;
  q29 = q29_save;
  q30 = q30_save;
  q31 = q31_save;
  q32 = q32_save;
}

// t vars
@external("tVarPool", "t1")
declare let t1: f64;
@external("tVarPool", "t2")
declare let t2: f64;
@external("tVarPool", "t3")
declare let t3: f64;
@external("tVarPool", "t4")
declare let t4: f64;
@external("tVarPool", "t5")
declare let t5: f64;
@external("tVarPool", "t6")
declare let t6: f64;
@external("tVarPool", "t7")
declare let t7: f64;
@external("tVarPool", "t8")
declare let t8: f64;

let t1_save: f64;
let t2_save: f64;
let t3_save: f64;
let t4_save: f64;
let t5_save: f64;
let t6_save: f64;
let t7_save: f64;
let t8_save: f64;

export function saveTs(): void {
  t1_save = t1;
  t2_save = t2;
  t3_save = t3;
  t4_save = t4;
  t5_save = t5;
  t6_save = t6;
  t7_save = t7;
  t8_save = t8;
}

export function restoreTs(): void {
  t1 = t1_save;
  t2 = t2_save;
  t3 = t3_save;
  t4 = t4_save;
  t5 = t5_save;
  t6 = t6_save;
  t7 = t7_save;
  t8 = t8_save;
}

// Reset shape vars

@external("shapePool0", "x_0")
declare let x_0: f64;
@external("shapePool0", "y_0")
declare let y_0: f64;
@external("shapePool0", "rad_0")
declare let rad_0: f64;
@external("shapePool0", "ang_0")
declare let ang_0: f64;
@external("shapePool0", "r_0")
declare let r_0: f64;
@external("shapePool0", "g_0")
declare let g_0: f64;
@external("shapePool0", "b_0")
declare let b_0: f64;
@external("shapePool0", "a_0")
declare let a_0: f64;
@external("shapePool0", "r2_0")
declare let r2_0: f64;
@external("shapePool0", "g2_0")
declare let g2_0: f64;
@external("shapePool0", "b2_0")
declare let b2_0: f64;
@external("shapePool0", "a2_0")
declare let a2_0: f64;
@external("shapePool0", "border_r_0")
declare let border_r_0: f64;
@external("shapePool0", "border_g_0")
declare let border_g_0: f64;
@external("shapePool0", "border_b_0")
declare let border_b_0: f64;
@external("shapePool0", "border_a_0")
declare let border_a_0: f64;
@external("shapePool0", "thickoutline_0")
declare let thickoutline_0: f64;
@external("shapePool0", "textured_0")
declare let textured_0: f64;
@external("shapePool0", "tex_zoom_0")
declare let tex_zoom_0: f64;
@external("shapePool0", "tex_ang_0")
declare let tex_ang_0: f64;
@external("shapePool0", "additive_0")
declare let additive_0: f64;

let x_0_save: f64;
let y_0_save: f64;
let rad_0_save: f64;
let ang_0_save: f64;
let r_0_save: f64;
let g_0_save: f64;
let b_0_save: f64;
let a_0_save: f64;
let r2_0_save: f64;
let g2_0_save: f64;
let b2_0_save: f64;
let a2_0_save: f64;
let border_r_0_save: f64;
let border_g_0_save: f64;
let border_b_0_save: f64;
let border_a_0_save: f64;
let thickoutline_0_save: f64;
let textured_0_save: f64;
let tex_zoom_0_save: f64;
let tex_ang_0_save: f64;
let additive_0_save: f64;

export function shape0_save(): void {
  x_0_save = x_0;
  y_0_save = y_0;
  rad_0_save = rad_0;
  ang_0_save = ang_0;
  r_0_save = r_0;
  g_0_save = g_0;
  b_0_save = b_0;
  a_0_save = a_0;
  r2_0_save = r2_0;
  g2_0_save = g2_0;
  b2_0_save = b2_0;
  a2_0_save = a2_0;
  border_r_0_save = border_r_0;
  border_g_0_save = border_g_0;
  border_b_0_save = border_b_0;
  border_a_0_save = border_a_0;
  thickoutline_0_save = thickoutline_0;
  textured_0_save = textured_0;
  tex_zoom_0_save = tex_zoom_0;
  tex_ang_0_save = tex_ang_0;
  additive_0_save = additive_0;
}

export function shape0_restore(): void {
  x_0 = x_0_save;
  y_0 = y_0_save;
  rad_0 = rad_0_save;
  ang_0 = ang_0_save;
  r_0 = r_0_save;
  g_0 = g_0_save;
  b_0 = b_0_save;
  a_0 = a_0_save;
  r2_0 = r2_0_save;
  g2_0 = g2_0_save;
  b2_0 = b2_0_save;
  a2_0 = a2_0_save;
  border_r_0 = border_r_0_save;
  border_g_0 = border_g_0_save;
  border_b_0 = border_b_0_save;
  border_a_0 = border_a_0_save;
  thickoutline_0 = thickoutline_0_save;
  textured_0 = textured_0_save;
  tex_zoom_0 = tex_zoom_0_save;
  tex_ang_0 = tex_ang_0_save;
  additive_0 = additive_0_save;
}

@external("shapePool1", "x_1")
declare let x_1: f64;
@external("shapePool1", "y_1")
declare let y_1: f64;
@external("shapePool1", "rad_1")
declare let rad_1: f64;
@external("shapePool1", "ang_1")
declare let ang_1: f64;
@external("shapePool1", "r_1")
declare let r_1: f64;
@external("shapePool1", "g_1")
declare let g_1: f64;
@external("shapePool1", "b_1")
declare let b_1: f64;
@external("shapePool1", "a_1")
declare let a_1: f64;
@external("shapePool1", "r2_1")
declare let r2_1: f64;
@external("shapePool1", "g2_1")
declare let g2_1: f64;
@external("shapePool1", "b2_1")
declare let b2_1: f64;
@external("shapePool1", "a2_1")
declare let a2_1: f64;
@external("shapePool1", "border_r_1")
declare let border_r_1: f64;
@external("shapePool1", "border_g_1")
declare let border_g_1: f64;
@external("shapePool1", "border_b_1")
declare let border_b_1: f64;
@external("shapePool1", "border_a_1")
declare let border_a_1: f64;
@external("shapePool1", "thickoutline_1")
declare let thickoutline_1: f64;
@external("shapePool1", "textured_1")
declare let textured_1: f64;
@external("shapePool1", "tex_zoom_1")
declare let tex_zoom_1: f64;
@external("shapePool1", "tex_ang_1")
declare let tex_ang_1: f64;
@external("shapePool1", "additive_1")
declare let additive_1: f64;

let x_1_save: f64;
let y_1_save: f64;
let rad_1_save: f64;
let ang_1_save: f64;
let r_1_save: f64;
let g_1_save: f64;
let b_1_save: f64;
let a_1_save: f64;
let r2_1_save: f64;
let g2_1_save: f64;
let b2_1_save: f64;
let a2_1_save: f64;
let border_r_1_save: f64;
let border_g_1_save: f64;
let border_b_1_save: f64;
let border_a_1_save: f64;
let thickoutline_1_save: f64;
let textured_1_save: f64;
let tex_zoom_1_save: f64;
let tex_ang_1_save: f64;
let additive_1_save: f64;

export function shape1_save(): void {
  x_1_save = x_1;
  y_1_save = y_1;
  rad_1_save = rad_1;
  ang_1_save = ang_1;
  r_1_save = r_1;
  g_1_save = g_1;
  b_1_save = b_1;
  a_1_save = a_1;
  r2_1_save = r2_1;
  g2_1_save = g2_1;
  b2_1_save = b2_1;
  a2_1_save = a2_1;
  border_r_1_save = border_r_1;
  border_g_1_save = border_g_1;
  border_b_1_save = border_b_1;
  border_a_1_save = border_a_1;
  thickoutline_1_save = thickoutline_1;
  textured_1_save = textured_1;
  tex_zoom_1_save = tex_zoom_1;
  tex_ang_1_save = tex_ang_1;
  additive_1_save = additive_1;
}

export function shape1_restore(): void {
  x_1 = x_1_save;
  y_1 = y_1_save;
  rad_1 = rad_1_save;
  ang_1 = ang_1_save;
  r_1 = r_1_save;
  g_1 = g_1_save;
  b_1 = b_1_save;
  a_1 = a_1_save;
  r2_1 = r2_1_save;
  g2_1 = g2_1_save;
  b2_1 = b2_1_save;
  a2_1 = a2_1_save;
  border_r_1 = border_r_1_save;
  border_g_1 = border_g_1_save;
  border_b_1 = border_b_1_save;
  border_a_1 = border_a_1_save;
  thickoutline_1 = thickoutline_1_save;
  textured_1 = textured_1_save;
  tex_zoom_1 = tex_zoom_1_save;
  tex_ang_1 = tex_ang_1_save;
  additive_1 = additive_1_save;
}

@external("shapePool2", "x_2")
declare let x_2: f64;
@external("shapePool2", "y_2")
declare let y_2: f64;
@external("shapePool2", "rad_2")
declare let rad_2: f64;
@external("shapePool2", "ang_2")
declare let ang_2: f64;
@external("shapePool2", "r_2")
declare let r_2: f64;
@external("shapePool2", "g_2")
declare let g_2: f64;
@external("shapePool2", "b_2")
declare let b_2: f64;
@external("shapePool2", "a_2")
declare let a_2: f64;
@external("shapePool2", "r2_2")
declare let r2_2: f64;
@external("shapePool2", "g2_2")
declare let g2_2: f64;
@external("shapePool2", "b2_2")
declare let b2_2: f64;
@external("shapePool2", "a2_2")
declare let a2_2: f64;
@external("shapePool2", "border_r_2")
declare let border_r_2: f64;
@external("shapePool2", "border_g_2")
declare let border_g_2: f64;
@external("shapePool2", "border_b_2")
declare let border_b_2: f64;
@external("shapePool2", "border_a_2")
declare let border_a_2: f64;
@external("shapePool2", "thickoutline_2")
declare let thickoutline_2: f64;
@external("shapePool2", "textured_2")
declare let textured_2: f64;
@external("shapePool2", "tex_zoom_2")
declare let tex_zoom_2: f64;
@external("shapePool2", "tex_ang_2")
declare let tex_ang_2: f64;
@external("shapePool2", "additive_2")
declare let additive_2: f64;

let x_2_save: f64;
let y_2_save: f64;
let rad_2_save: f64;
let ang_2_save: f64;
let r_2_save: f64;
let g_2_save: f64;
let b_2_save: f64;
let a_2_save: f64;
let r2_2_save: f64;
let g2_2_save: f64;
let b2_2_save: f64;
let a2_2_save: f64;
let border_r_2_save: f64;
let border_g_2_save: f64;
let border_b_2_save: f64;
let border_a_2_save: f64;
let thickoutline_2_save: f64;
let textured_2_save: f64;
let tex_zoom_2_save: f64;
let tex_ang_2_save: f64;
let additive_2_save: f64;

export function shape2_save(): void {
  x_2_save = x_2;
  y_2_save = y_2;
  rad_2_save = rad_2;
  ang_2_save = ang_2;
  r_2_save = r_2;
  g_2_save = g_2;
  b_2_save = b_2;
  a_2_save = a_2;
  r2_2_save = r2_2;
  g2_2_save = g2_2;
  b2_2_save = b2_2;
  a2_2_save = a2_2;
  border_r_2_save = border_r_2;
  border_g_2_save = border_g_2;
  border_b_2_save = border_b_2;
  border_a_2_save = border_a_2;
  thickoutline_2_save = thickoutline_2;
  textured_2_save = textured_2;
  tex_zoom_2_save = tex_zoom_2;
  tex_ang_2_save = tex_ang_2;
  additive_2_save = additive_2;
}

export function shape2_restore(): void {
  x_2 = x_2_save;
  y_2 = y_2_save;
  rad_2 = rad_2_save;
  ang_2 = ang_2_save;
  r_2 = r_2_save;
  g_2 = g_2_save;
  b_2 = b_2_save;
  a_2 = a_2_save;
  r2_2 = r2_2_save;
  g2_2 = g2_2_save;
  b2_2 = b2_2_save;
  a2_2 = a2_2_save;
  border_r_2 = border_r_2_save;
  border_g_2 = border_g_2_save;
  border_b_2 = border_b_2_save;
  border_a_2 = border_a_2_save;
  thickoutline_2 = thickoutline_2_save;
  textured_2 = textured_2_save;
  tex_zoom_2 = tex_zoom_2_save;
  tex_ang_2 = tex_ang_2_save;
  additive_2 = additive_2_save;
}

@external("shapePool3", "x_3")
declare let x_3: f64;
@external("shapePool3", "y_3")
declare let y_3: f64;
@external("shapePool3", "rad_3")
declare let rad_3: f64;
@external("shapePool3", "ang_3")
declare let ang_3: f64;
@external("shapePool3", "r_3")
declare let r_3: f64;
@external("shapePool3", "g_3")
declare let g_3: f64;
@external("shapePool3", "b_3")
declare let b_3: f64;
@external("shapePool3", "a_3")
declare let a_3: f64;
@external("shapePool3", "r2_3")
declare let r2_3: f64;
@external("shapePool3", "g2_3")
declare let g2_3: f64;
@external("shapePool3", "b2_3")
declare let b2_3: f64;
@external("shapePool3", "a2_3")
declare let a2_3: f64;
@external("shapePool3", "border_r_3")
declare let border_r_3: f64;
@external("shapePool3", "border_g_3")
declare let border_g_3: f64;
@external("shapePool3", "border_b_3")
declare let border_b_3: f64;
@external("shapePool3", "border_a_3")
declare let border_a_3: f64;
@external("shapePool3", "thickoutline_3")
declare let thickoutline_3: f64;
@external("shapePool3", "textured_3")
declare let textured_3: f64;
@external("shapePool3", "tex_zoom_3")
declare let tex_zoom_3: f64;
@external("shapePool3", "tex_ang_3")
declare let tex_ang_3: f64;
@external("shapePool3", "additive_3")
declare let additive_3: f64;

let x_3_save: f64;
let y_3_save: f64;
let rad_3_save: f64;
let ang_3_save: f64;
let r_3_save: f64;
let g_3_save: f64;
let b_3_save: f64;
let a_3_save: f64;
let r2_3_save: f64;
let g2_3_save: f64;
let b2_3_save: f64;
let a2_3_save: f64;
let border_r_3_save: f64;
let border_g_3_save: f64;
let border_b_3_save: f64;
let border_a_3_save: f64;
let thickoutline_3_save: f64;
let textured_3_save: f64;
let tex_zoom_3_save: f64;
let tex_ang_3_save: f64;
let additive_3_save: f64;

export function shape3_save(): void {
  x_3_save = x_3;
  y_3_save = y_3;
  rad_3_save = rad_3;
  ang_3_save = ang_3;
  r_3_save = r_3;
  g_3_save = g_3;
  b_3_save = b_3;
  a_3_save = a_3;
  r2_3_save = r2_3;
  g2_3_save = g2_3;
  b2_3_save = b2_3;
  a2_3_save = a2_3;
  border_r_3_save = border_r_3;
  border_g_3_save = border_g_3;
  border_b_3_save = border_b_3;
  border_a_3_save = border_a_3;
  thickoutline_3_save = thickoutline_3;
  textured_3_save = textured_3;
  tex_zoom_3_save = tex_zoom_3;
  tex_ang_3_save = tex_ang_3;
  additive_3_save = additive_3;
}

export function shape3_restore(): void {
  x_3 = x_3_save;
  y_3 = y_3_save;
  rad_3 = rad_3_save;
  ang_3 = ang_3_save;
  r_3 = r_3_save;
  g_3 = g_3_save;
  b_3 = b_3_save;
  a_3 = a_3_save;
  r2_3 = r2_3_save;
  g2_3 = g2_3_save;
  b2_3 = b2_3_save;
  a2_3 = a2_3_save;
  border_r_3 = border_r_3_save;
  border_g_3 = border_g_3_save;
  border_b_3 = border_b_3_save;
  border_a_3 = border_a_3_save;
  thickoutline_3 = thickoutline_3_save;
  textured_3 = textured_3_save;
  tex_zoom_3 = tex_zoom_3_save;
  tex_ang_3 = tex_ang_3_save;
  additive_3 = additive_3_save;
}
