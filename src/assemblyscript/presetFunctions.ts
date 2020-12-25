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
@external("pixelVarPool", "cy")
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

export function saveQsAfterFrame(): void {
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

export function restoreQsToAfterFrame(): void {
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
