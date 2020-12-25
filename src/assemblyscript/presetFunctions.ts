// Reset pixel eq vars

@external("varPool", "warp")
declare let warp: f64;
@external("varPool", "zoom")
declare let zoom: f64;
@external("varPool", "zoomexp")
declare let zoomexp: f64;
@external("varPool", "cx")
declare let cx: f64;
@external("varPool", "cy")
declare let cy: f64;
@external("varPool", "sx")
declare let sx: f64;
@external("varPool", "cy")
declare let sy: f64;
@external("varPool", "dx")
declare let dx: f64;
@external("varPool", "dy")
declare let dy: f64;
@external("varPool", "rot")
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

@external("varPool", "q1")
declare let q1: f64;
@external("varPool", "q2")
declare let q2: f64;
@external("varPool", "q3")
declare let q3: f64;
@external("varPool", "q4")
declare let q4: f64;
@external("varPool", "q5")
declare let q5: f64;
@external("varPool", "q6")
declare let q6: f64;
@external("varPool", "q7")
declare let q7: f64;
@external("varPool", "q8")
declare let q8: f64;
@external("varPool", "q9")
declare let q9: f64;
@external("varPool", "q10")
declare let q10: f64;
@external("varPool", "q11")
declare let q11: f64;
@external("varPool", "q12")
declare let q12: f64;
@external("varPool", "q13")
declare let q13: f64;
@external("varPool", "q14")
declare let q14: f64;
@external("varPool", "q15")
declare let q15: f64;
@external("varPool", "q16")
declare let q16: f64;
@external("varPool", "q17")
declare let q17: f64;
@external("varPool", "q18")
declare let q18: f64;
@external("varPool", "q19")
declare let q19: f64;
@external("varPool", "q20")
declare let q20: f64;
@external("varPool", "q21")
declare let q21: f64;
@external("varPool", "q22")
declare let q22: f64;
@external("varPool", "q23")
declare let q23: f64;
@external("varPool", "q24")
declare let q24: f64;
@external("varPool", "q25")
declare let q25: f64;
@external("varPool", "q26")
declare let q26: f64;
@external("varPool", "q27")
declare let q27: f64;
@external("varPool", "q28")
declare let q28: f64;
@external("varPool", "q29")
declare let q29: f64;
@external("varPool", "q30")
declare let q30: f64;
@external("varPool", "q31")
declare let q31: f64;
@external("varPool", "q32")
declare let q32: f64;

@external("varPool", "q1_afterFrame")
declare let q1_afterFrame: f64;
@external("varPool", "q2_afterFrame")
declare let q2_afterFrame: f64;
@external("varPool", "q3_afterFrame")
declare let q3_afterFrame: f64;
@external("varPool", "q4_afterFrame")
declare let q4_afterFrame: f64;
@external("varPool", "q5_afterFrame")
declare let q5_afterFrame: f64;
@external("varPool", "q6_afterFrame")
declare let q6_afterFrame: f64;
@external("varPool", "q7_afterFrame")
declare let q7_afterFrame: f64;
@external("varPool", "q8_afterFrame")
declare let q8_afterFrame: f64;
@external("varPool", "q9_afterFrame")
declare let q9_afterFrame: f64;
@external("varPool", "q10_afterFrame")
declare let q10_afterFrame: f64;
@external("varPool", "q11_afterFrame")
declare let q11_afterFrame: f64;
@external("varPool", "q12_afterFrame")
declare let q12_afterFrame: f64;
@external("varPool", "q13_afterFrame")
declare let q13_afterFrame: f64;
@external("varPool", "q14_afterFrame")
declare let q14_afterFrame: f64;
@external("varPool", "q15_afterFrame")
declare let q15_afterFrame: f64;
@external("varPool", "q16_afterFrame")
declare let q16_afterFrame: f64;
@external("varPool", "q17_afterFrame")
declare let q17_afterFrame: f64;
@external("varPool", "q18_afterFrame")
declare let q18_afterFrame: f64;
@external("varPool", "q19_afterFrame")
declare let q19_afterFrame: f64;
@external("varPool", "q20_afterFrame")
declare let q20_afterFrame: f64;
@external("varPool", "q21_afterFrame")
declare let q21_afterFrame: f64;
@external("varPool", "q22_afterFrame")
declare let q22_afterFrame: f64;
@external("varPool", "q23_afterFrame")
declare let q23_afterFrame: f64;
@external("varPool", "q24_afterFrame")
declare let q24_afterFrame: f64;
@external("varPool", "q25_afterFrame")
declare let q25_afterFrame: f64;
@external("varPool", "q26_afterFrame")
declare let q26_afterFrame: f64;
@external("varPool", "q27_afterFrame")
declare let q27_afterFrame: f64;
@external("varPool", "q28_afterFrame")
declare let q28_afterFrame: f64;
@external("varPool", "q29_afterFrame")
declare let q29_afterFrame: f64;
@external("varPool", "q30_afterFrame")
declare let q30_afterFrame: f64;
@external("varPool", "q31_afterFrame")
declare let q31_afterFrame: f64;
@external("varPool", "q32_afterFrame")
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
