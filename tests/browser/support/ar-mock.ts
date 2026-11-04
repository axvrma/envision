import type { Page } from "@playwright/test";
/** Explicit engine simulation. This uses real Three.js/WebGL but no camera or SLAM. */
export async function mockEightWall(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "xr", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, "SpeechRecognition", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    (window as any).__tracking = "NORMAL";
    (window as any).__stopped = 0;
  });
  await page.route("https://cdn.jsdelivr.net/**", async (route) => {
    const url = route.request().url();
    let body = "";
    if (url.includes("/xrextras"))
      body = "window.XRExtras={FullWindowCanvas:{pipelineModule:()=>({})}};";
    else if (url.includes("/landing-page"))
      body = "window.LandingPage={pipelineModule:()=>({})};";
    else
      body = `(()=>{let modules=[],interval,scene,camera,renderer;window.XR8={CanvasScreenshot:{configure:options=>{window.__photoConfig=options;},pipelineModule:()=>({name:'mock-camera-screenshot'}),takeScreenshot:async()=>{if(window.__captureFailure)throw new Error('Camera screenshot blocked');if(window.__capturePending)return new Promise(()=>{});window.__captureHelpersVisible=scene.children[0].children.filter(child=>child.isMesh||child.type==='BoxHelper'||child.isGroup&&child!==scene.children[0]).filter(child=>child.visible&&!child.userData.model).length;renderer.render(scene,camera);return renderer.domElement.toDataURL('image/jpeg',.9).split(',')[1];}},GlTextureRenderer:{pipelineModule:()=>({})},Threejs:{pipelineModule:()=>({}),xrScene:()=>({scene,camera,renderer})},XrController:{hitTest:()=>window.__surfaceHits||[],configure:config=>{window.__engineConfig=config;},pipelineModule:()=>({}),updateCameraProjectionMatrix:()=>{}},addCameraPipelineModules:value=>{modules=value;window.__modules=value;},run:({canvas})=>{if(window.__startupFailure){modules.forEach(module=>module.onCameraStatusChange?.({status:"failed"}));return;}scene=new THREE.Scene();scene.background=new THREE.Color(0x234c66);window.__arScene=scene;camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.01,30);window.__arCamera=camera;camera.position.set(0,1.5,0);camera.lookAt(0,0,-1.5);camera.updateMatrixWorld();renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setSize(innerWidth,innerHeight);modules.forEach(module=>module.onStart?.({canvas}));modules.forEach(module=>module.onAttach?.({canvas,videoWidth:1280,videoHeight:960}));camera.aspect=canvas.width/canvas.height;camera.updateProjectionMatrix();renderer.setSize(canvas.width,canvas.height,false);let lastWidth=canvas.width,lastHeight=canvas.height;window.__engineCanvas=canvas;interval=setInterval(()=>{if(lastWidth!==canvas.width||lastHeight!==canvas.height){lastWidth=canvas.width;lastHeight=canvas.height;renderer.setSize(lastWidth,lastHeight,false);camera.aspect=lastWidth/lastHeight;camera.updateProjectionMatrix();}if(!window.__pauseTracking)modules.forEach(module=>module.onUpdate?.({processCpuResult:{reality:{trackingStatus:window.__tracking,position:{x:camera.position.x,y:camera.position.y,z:camera.position.z},rotation:{x:camera.quaternion.x,y:camera.quaternion.y,z:camera.quaternion.z,w:camera.quaternion.w}}}}));renderer.render(scene,camera);},16);},stop:()=>{window.__stopped++;clearInterval(interval);modules.forEach(module=>module.onDetach?.());},clearCameraPipelineModules:()=>{modules=[];}};if(window.__noCameraPhoto)delete window.XR8.CanvasScreenshot;window.dispatchEvent(new Event('xrloaded'));})();`;
    await route.fulfill({ contentType: "application/javascript", body });
  });
}
export async function launchMockAR(page: Page) {
  await mockEightWall(page);
  await page.goto("/ar/");
  await page.getByRole("button", { name: "Start AR Experience" }).click();
}
