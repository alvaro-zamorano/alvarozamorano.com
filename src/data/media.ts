// Renders of Kit on Cloudinary, made with the engine itself (tools/render_stills.py).
// Re-render and bump the versions whenever Kit changes. Keep the version segment:
// without it, Cloudinary reads the "v3" folder as a version and returns 400.
const base = 'https://res.cloudinary.com/dhuc2wmhp/image/upload';

export const media = {
  og: `${base}/f_jpg,q_85/v1790353513/alvarozamorano/v3/og.png`,
  still: `${base}/f_auto,q_auto,w_900/v1790353515/alvarozamorano/v3/kit-still.png`,
  stillSmall: `${base}/f_auto,q_auto,w_600/v1790353515/alvarozamorano/v3/kit-still.png`,
};

// StudioAZM's own clips, as published on studioazm.com (its Cloudinary account).
// The reel excerpt is ten seconds, silent, and only loads when the section is near.
const studioBase = 'https://res.cloudinary.com/dd6onz7yk/video/upload';
const reelId = 'E32A1C50-4FB0-4D73-A852-AB8111586409_tinoxg';
export const studioMedia = {
  reel: {
    mp4: `${studioBase}/so_0,eo_10,w_1280,c_scale,q_auto:good,ac_none,f_mp4/${reelId}.mp4`,
    webm: `${studioBase}/so_0,eo_10,w_1280,c_scale,q_auto:good,ac_none,f_webm/${reelId}.webm`,
    poster: `${studioBase}/so_1,w_1280,c_scale,q_auto,f_auto/${reelId}.jpg`,
  },
  // one entry per piece, in the order of studio.pieces: a silent 3:2 loop for
  // the films (cut from the delivered films and raw clips, see loop() below), a
  // still for the campaign, whose spots come out in October
  pieces: [
    loop('prosegur-hybrid', 1790411081, 3),
    loop('prosegur-pops', 1790411082, 6),
    { still: `${base}/f_auto,q_auto,w_640/v1790372698/alvarozamorano/v3/studio/boston-pharmacy.jpg` },
    loop('cuchitas', 1790411085, 1.5),
  ] as ({ mp4: string; webm: string; poster: string; still?: undefined } | { still: string; mp4?: undefined })[],
};

// A silent loop uploaded to alvarozamorano/v3/studio/ at 1440x960, served at 960
// px wide; the poster is the frame at `at` seconds.
function loop(id: string, version: number, at: number) {
  const v = 'https://res.cloudinary.com/dhuc2wmhp/video/upload';
  const path = `v${version}/alvarozamorano/v3/studio/${id}`;
  return {
    mp4: `${v}/w_960,c_scale,q_auto:eco,ac_none,f_mp4/${path}.mp4`,
    webm: `${v}/w_960,c_scale,q_auto:eco,ac_none,f_webm/${path}.webm`,
    poster: `${v}/so_${at},w_960,c_scale,q_auto,f_auto/${path}.jpg`,
  };
}

// Kit's log: one scene at a time on a 3:4 stage, served at 720x960. Three are
// the "Bitácora de Kit" clips from the old site (StudioAZM's Cloudinary), 9:16,
// trimmed before their end card; the rest are Higgsfield clips in
// higgsfield/kit (3:4, and one square), the rooftop cut before Kit's colours
// drift. All are cropped to 3:4. One crop mode per transformation: c_fill next
// to c_scale lets the scale win and squashes the frame. `dur` is the clip's
// length in seconds: the WebMs arrive without one until fully downloaded, and
// the stage needs it to draw its progress.
const logClip = (cloud: string, path: string, poster: number, end?: number) => {
  const v = `https://res.cloudinary.com/${cloud}/video/upload`;
  const trim = end ? `so_0,eo_${end},` : '';
  const size = 'c_fill,ar_3:4,g_center,w_720';
  return {
    mp4: `${v}/${trim}${size},q_auto:eco,ac_none,f_mp4/${path}.mp4`,
    webm: `${v}/${trim}${size},q_auto:eco,ac_none,f_webm/${path}.webm`,
    poster: `${v}/so_${poster},${size},q_auto,f_auto/${path}.jpg`,
    dur: end ?? 8,
  };
};
const endCard = 4.9;
export const logMedia: Record<string, { mp4: string; webm: string; poster: string; dur: number }> = {
  grandline: logClip('dd6onz7yk', 'v1783428613/autonomy-by-design/motion/kit-grandline-mapa', 2, endCard),
  rooftop: logClip('dhuc2wmhp', 'v1790415158/higgsfield/kit/util/hf_20260722_173053_69da918b-5d9b-48fe-8fa5-33ce309c4f26', 1.5, 6.5),
  builder: logClip('dd6onz7yk', 'v1783428615/autonomy-by-design/motion/kit-builder-done', 2.5, endCard),
  kraken: logClip('dhuc2wmhp', 'v1790415158/higgsfield/kit/util/hf_20260722_153057_c6cf8fc8-0087-4ed7-a0b3-1fcd49f6eca8', 4.5),
  traces: logClip('dd6onz7yk', 'v1783428615/autonomy-by-design/motion/kit-proof-traces', 2.5, endCard),
  handoffs: logClip('dd6onz7yk', 'v1783465196/autonomy-by-design/motion/kit-crew-handoffs', 2.5, endCard),
  hammock: logClip('dhuc2wmhp', 'v1790415154/higgsfield/kit/prueba/hf_20260722_111257_26ceebd0-734b-4b3e-bb71-3ca0494f16c7', 4.5),
  machines: logClip('dhuc2wmhp', 'v1790415158/higgsfield/kit/util/hf_20260722_165606_94409d27-a48a-49d7-ba33-6ee90d0a39c0', 5.4),
};
