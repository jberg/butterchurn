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

@external("qVarPool", "q1_afterFrame")
declare let q1_afterFrame: f64;
@external("qVarPool", "q2_afterFrame")
declare let q2_afterFrame: f64;
@external("qVarPool", "q3_afterFrame")
declare let q3_afterFrame: f64;
@external("qVarPool", "q4_afterFrame")
declare let q4_afterFrame: f64;
@external("qVarPool", "q5_afterFrame")
declare let q5_afterFrame: f64;
@external("qVarPool", "q6_afterFrame")
declare let q6_afterFrame: f64;
@external("qVarPool", "q7_afterFrame")
declare let q7_afterFrame: f64;
@external("qVarPool", "q8_afterFrame")
declare let q8_afterFrame: f64;
@external("qVarPool", "q9_afterFrame")
declare let q9_afterFrame: f64;
@external("qVarPool", "q10_afterFrame")
declare let q10_afterFrame: f64;
@external("qVarPool", "q11_afterFrame")
declare let q11_afterFrame: f64;
@external("qVarPool", "q12_afterFrame")
declare let q12_afterFrame: f64;
@external("qVarPool", "q13_afterFrame")
declare let q13_afterFrame: f64;
@external("qVarPool", "q14_afterFrame")
declare let q14_afterFrame: f64;
@external("qVarPool", "q15_afterFrame")
declare let q15_afterFrame: f64;
@external("qVarPool", "q16_afterFrame")
declare let q16_afterFrame: f64;
@external("qVarPool", "q17_afterFrame")
declare let q17_afterFrame: f64;
@external("qVarPool", "q18_afterFrame")
declare let q18_afterFrame: f64;
@external("qVarPool", "q19_afterFrame")
declare let q19_afterFrame: f64;
@external("qVarPool", "q20_afterFrame")
declare let q20_afterFrame: f64;
@external("qVarPool", "q21_afterFrame")
declare let q21_afterFrame: f64;
@external("qVarPool", "q22_afterFrame")
declare let q22_afterFrame: f64;
@external("qVarPool", "q23_afterFrame")
declare let q23_afterFrame: f64;
@external("qVarPool", "q24_afterFrame")
declare let q24_afterFrame: f64;
@external("qVarPool", "q25_afterFrame")
declare let q25_afterFrame: f64;
@external("qVarPool", "q26_afterFrame")
declare let q26_afterFrame: f64;
@external("qVarPool", "q27_afterFrame")
declare let q27_afterFrame: f64;
@external("qVarPool", "q28_afterFrame")
declare let q28_afterFrame: f64;
@external("qVarPool", "q29_afterFrame")
declare let q29_afterFrame: f64;
@external("qVarPool", "q30_afterFrame")
declare let q30_afterFrame: f64;
@external("qVarPool", "q31_afterFrame")
declare let q31_afterFrame: f64;
@external("qVarPool", "q32_afterFrame")
declare let q32_afterFrame: f64;

export function saveQsAfterFrame(): void {
  q1_afterFrame = q1;
  q2_afterFrame = q2;
  q3_afterFrame = q3;
  q4_afterFrame = q4;
  q5_afterFrame = q5;
  q6_afterFrame = q6;
  q7_afterFrame = q7;
  q8_afterFrame = q8;
  q9_afterFrame = q9;
  q10_afterFrame = q10;
  q11_afterFrame = q11;
  q12_afterFrame = q12;
  q13_afterFrame = q13;
  q14_afterFrame = q14;
  q15_afterFrame = q15;
  q16_afterFrame = q16;
  q17_afterFrame = q17;
  q18_afterFrame = q18;
  q19_afterFrame = q19;
  q20_afterFrame = q20;
  q21_afterFrame = q21;
  q22_afterFrame = q22;
  q23_afterFrame = q23;
  q24_afterFrame = q24;
  q25_afterFrame = q25;
  q26_afterFrame = q26;
  q27_afterFrame = q27;
  q28_afterFrame = q28;
  q29_afterFrame = q29;
  q30_afterFrame = q30;
  q31_afterFrame = q31;
  q32_afterFrame = q32;
}

export function setQsToAfterFrame(): void {
  q1 = q1_afterFrame;
  q2 = q2_afterFrame;
  q3 = q3_afterFrame;
  q4 = q4_afterFrame;
  q5 = q5_afterFrame;
  q6 = q6_afterFrame;
  q7 = q7_afterFrame;
  q8 = q8_afterFrame;
  q9 = q9_afterFrame;
  q10 = q10_afterFrame;
  q11 = q11_afterFrame;
  q12 = q12_afterFrame;
  q13 = q13_afterFrame;
  q14 = q14_afterFrame;
  q15 = q15_afterFrame;
  q16 = q16_afterFrame;
  q17 = q17_afterFrame;
  q18 = q18_afterFrame;
  q19 = q19_afterFrame;
  q20 = q20_afterFrame;
  q21 = q21_afterFrame;
  q22 = q22_afterFrame;
  q23 = q23_afterFrame;
  q24 = q24_afterFrame;
  q25 = q25_afterFrame;
  q26 = q26_afterFrame;
  q27 = q27_afterFrame;
  q28 = q28_afterFrame;
  q29 = q29_afterFrame;
  q30 = q30_afterFrame;
  q31 = q31_afterFrame;
  q32 = q32_afterFrame;
}
