// Central application state. No persistence — everything lives in memory
// for the session only, per the "nothing is retained" privacy requirement.
//
// Plain global-namespace script (not an ES module) so the app also works
// when index.html is opened directly via file:// (double-click), where
// browsers block ES module loading under CORS.

window.WM = window.WM || {};

WM.defaultWatermark = function defaultWatermark() {
  return {
    mode: 'text', // 'text' | 'logo' | 'both'
    text: {
      content: 'SAMPLE',
      font: "Arial, Helvetica, sans-serif",
      color: '#ffffff',
      size: 48, // px, relative to a 1000px-wide reference canvas; scaled per image
    },
    logo: {
      img: null,        // HTMLImageElement (decoded logo, shared across images)
      sizePct: 25,       // logo width as % of canvas width
    },
    opacity: 70,   // 0-100
    rotation: 0,   // degrees
    position: { x: 0.5, y: 0.5 }, // fractional canvas coords (0-1)
  };
};

WM.cloneWatermark = function cloneWatermark(wm) {
  return {
    mode: wm.mode,
    text: { ...wm.text },
    logo: { ...wm.logo },
    opacity: wm.opacity,
    rotation: wm.rotation,
    position: { ...wm.position },
  };
};

WM.state = {
  images: [],       // { id, file, canvas (downscaled source), width, height, thumbUrl, watermark }
  activeId: null,
  logoImage: null,  // decoded HTMLImageElement for the logo, shared across all images
  logoFile: null,
  dragState: null,  // transient drag info, not persisted
};

let wmNextId = 1;
WM.makeImageId = function makeImageId() {
  return 'img-' + (wmNextId++);
};

WM.getActiveImage = function getActiveImage() {
  return WM.state.images.find(im => im.id === WM.state.activeId) || null;
};
