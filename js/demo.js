/* ============================================================
   DEMO SHOWCASE — 1:1 Timeline Engine
   Ported from palette-saas useDemoSequence.ts + demoData.ts
   ============================================================ */
(function () {
  'use strict';

  /* ── Position constants (exact from demoData.ts) ── */
  var mainX = 0, subX = 280;
  var cardCol0 = 530, cardCol1 = 820, cardCol2 = 1110;
  var charCardH = 400, sceneCardH = 190, cardGap = 20;
  var scriptY = 100, storyOverviewY = 60, entityGroupY = 280, charsSubY = 150;
  var charRow0Y = 40;
  var charRow1Y = charRow0Y + charCardH + cardGap;
  var scenesSubY = charRow1Y + charCardH + 50;
  var sceneRow0Y = scenesSubY - 20;
  var propsSubY = sceneRow0Y + sceneCardH + 50;
  var propRow0Y = propsSubY - 20;
  var storyboardY = propRow0Y + sceneCardH + 200;
  var arcY = storyboardY + 60;
  var editorY = arcY + 280;

  /* ── Scene data (exact from demoData.ts) ── */
  var SCENES = [
    { id:'s1', title:'Dust and Destiny', content:'The sun blazes over the parched plains of West Texas, 1873. A lone rider appears on the horizon.', tension:25, location:'Open Plains', characters:['Eli'] },
    { id:'s2', title:"The Devil's Saloon", content:'Eli pushes through the swinging doors of the Dusty Spur Saloon. Inside, he meets Clara Dawson.', tension:50, location:'Dusty Spur Saloon', characters:['Eli','Clara'] },
    { id:'s3', title:'The Old Alliance', content:'Eli seeks out his old partner, "Ironhand" Jack Moreno, now a blacksmith at the edge of town.', tension:35, location:'Redstone Town', characters:['Eli','Jack'] },
    { id:'s4', title:'Ambush at Snake Canyon', content:'Riding toward the mines at dawn, Eli and Jack are ambushed in Snake Canyon.', tension:85, location:'Snake Canyon', characters:['Eli','Jack','Scarrow'] },
    { id:'s5', title:'The Reckoning', content:'Under a blood-red sunset, Eli walks alone into the mining compound.', tension:60, location:'Silver Mine', characters:['Eli','Scarrow'] }
  ];

  /* ── Camera targets (exact from demoData.ts) ── */
  var CAMERA = {
    fit:        { x: 550, y: (editorY + charRow0Y) / 2, zoom: 0.35 },
    script:     { x: (mainX + subX + 250) / 2, y: scriptY, zoom: 0.8 },
    characters: { x: (cardCol0 + cardCol1 + 280) / 2, y: (charRow0Y + charRow1Y + charCardH) / 2, zoom: 0.35 },
    scenes:     { x: (cardCol0 + cardCol2 + 280) / 2, y: sceneRow0Y + sceneCardH / 2, zoom: 0.5 },
    props:      { x: (cardCol0 + cardCol1 + 280) / 2, y: propRow0Y + sceneCardH / 2, zoom: 0.55 },
    arc:        { x: subX - 40 + 410, y: arcY + 110, zoom: 0.6 },
    'arc-0':    { x: subX - 40 + 150, y: arcY + 110, zoom: 0.65 },
    'arc-1':    { x: subX - 40 + 250, y: arcY + 100, zoom: 0.65 },
    'arc-2':    { x: subX - 40 + 410, y: arcY + 110, zoom: 0.65 },
    'arc-3':    { x: subX - 40 + 560, y: arcY + 80, zoom: 0.7 },
    'arc-4':    { x: subX - 40 + 680, y: arcY + 100, zoom: 0.65 },
    editor:     { x: mainX + 100, y: editorY, zoom: 0.7 },
    overview:   { x: 550, y: (editorY + charRow0Y) / 2, zoom: 0.35 }
  };

  /* ── Phase visibility (exact from demoData.ts PHASES) ── */
  var PHASES = [
    { nodes:[], edges:[] },
    { nodes:['script','script-wizard'], edges:['e-wizard-script'] },
    { nodes:['entityGroup','entity-characters'], edges:['e-script-entityGroup','e-chars-entity'] },
    { nodes:['entity-char-eli'], edges:['e-eli-chars'] },
    { nodes:['entity-char-clara'], edges:['e-clara-chars'] },
    { nodes:['entity-char-jack'], edges:['e-jack-chars'] },
    { nodes:['entity-char-scarrow'], edges:['e-scarrow-chars'] },
    { nodes:['entity-scenes','entity-scene-redstone'], edges:['e-scenes-entity','e-redstone-scenes'] },
    { nodes:['entity-scene-canyon'], edges:['e-canyon-scenes'] },
    { nodes:['entity-scene-mine'], edges:['e-mine-scenes'] },
    { nodes:['entity-props','entity-prop-revolvers'], edges:['e-props-entity','e-revolvers-props'] },
    { nodes:['entity-prop-poster'], edges:['e-poster-props'] },
    { nodes:['storyboard','storyboard-arc'], edges:['e-entityGroup-storyboard','e-arc-storyboard'] },
    { nodes:['editor'], edges:['e-storyboard-editor'] }
  ];

  /* ── Step node status updates per phase ── */
  var STEP_UPDATES = {
    1: { script: { complete: true, hasChildren: true } },
    2: { entityGroup: { complete: true, hasChildren: true } },
    12: { storyboard: { complete: true } },
    13: { editor: { complete: true } }
  };

  /* ── Chat / Script text (exact from source) ── */
  var MSG_SCRIPT = '@Script Generate a Western bounty hunter story with dramatic tension and 5 scenes';
  var MSG_CHARS  = '@Characters Create 4 main characters with AI-generated portraits';
  var MSG_SCENES = '@Scenes Create 3 locations and @Props add 2 key items';

  var CONCEPT_TEXT = 'A weathered bounty hunter rides into a dying frontier town to take down a ruthless outlaw gang...';
  var STORY_TEXT = '## Dust and Destiny\n\nThe sun blazes over the parched plains of West Texas, 1873. A lone rider appears on the horizon \u2014 Elijah \u201cEli\u201d Cain, a weathered bounty hunter haunted by his past. He rides into the dying town of Redstone, where the sheriff was murdered last week and outlaws rule the streets.\n\n---\n\n## The Devil\u2019s Saloon\n\nEli pushes through the swinging doors of the Dusty Spur Saloon. Inside, he meets Clara Dawson, the saloon owner and secret informant. She tells him about the Scarrow Gang \u2014 led by the ruthless Victor Scarrow \u2014 who have taken over the silver mines and are bleeding the town dry.';

  /* ── Timeline (exact from useDemoSequence.ts TIMELINE) ── */
  var TIMELINE = [
    { delay:0,     phase:0,  stats:[0,0,0,0], rightPanel:'overview', scriptPhase:0, statsCollapsed:false, chatFocus:true },
    { delay:800,   phase:0,  stats:[0,0,0,0], startTyping:MSG_SCRIPT },
    { delay:2600,  phase:0,  stats:[0,0,0,0], chatUnfocus:true },
    { delay:4200,  phase:1,  stats:[0,0,0,0], scriptPhase:1, message:{role:'user',content:MSG_SCRIPT}, clearInput:true, rightPanel:'script', camera:'script' },
    { delay:4800,  phase:1,  stats:[0,0,0,0], scriptPhase:2, message:{role:'ai',content:'Generating your Western script...'} },
    { delay:6000,  phase:1,  stats:[0,0,0,0], scriptPhase:3 },
    { delay:8400,  phase:1,  stats:[5,0,0,0], message:{role:'ai',content:'Script complete \u2014 5 scenes, 891 words.'}, rightPanel:'overview', scriptPhase:3, camera:'fit', statsCollapsed:false },
    { delay:10400, phase:1,  stats:[5,0,0,0], startTyping:MSG_CHARS, statsCollapsed:true },
    { delay:13100, phase:1,  stats:[5,0,0,0], message:{role:'user',content:MSG_CHARS}, clearInput:true },
    { delay:13700, phase:2,  stats:[5,0,0,0], message:{role:'ai',content:'Generating characters with AI portraits...'} },
    { delay:14100, phase:3,  stats:[5,1,0,0], camera:'characters' },
    { delay:14400, phase:4,  stats:[5,2,0,0] },
    { delay:14700, phase:5,  stats:[5,3,0,0] },
    { delay:15000, phase:6,  stats:[5,4,0,0] },
    { delay:16200, phase:6,  stats:[5,4,0,0], startTyping:MSG_SCENES },
    { delay:18700, phase:6,  stats:[5,4,0,0], message:{role:'user',content:MSG_SCENES}, clearInput:true },
    { delay:19200, phase:7,  stats:[5,4,1,0], message:{role:'ai',content:'Creating scene references and props...'}, camera:'scenes' },
    { delay:19500, phase:8,  stats:[5,4,2,0] },
    { delay:19800, phase:9,  stats:[5,4,3,0] },
    { delay:20500, phase:10, stats:[5,4,3,1], camera:'props' },
    { delay:20800, phase:11, stats:[5,4,3,2] },
    { delay:22100, phase:12, stats:[5,4,3,2], message:{role:'ai',content:'Storyboard ready \u2014 5 scenes with rising tension.'}, camera:'arc', statsCollapsed:false },
    { delay:23900, phase:12, stats:[5,4,3,2], hoveredArc:0, camera:'arc-0', statsCollapsed:true },
    { delay:24900, phase:12, stats:[5,4,3,2], hoveredArc:1, camera:'arc-1' },
    { delay:25900, phase:12, stats:[5,4,3,2], hoveredArc:2, camera:'arc-2' },
    { delay:26900, phase:12, stats:[5,4,3,2], hoveredArc:3, camera:'arc-3' },
    { delay:28900, phase:12, stats:[5,4,3,2], hoveredArc:4, camera:'arc-4' },
    { delay:30100, phase:12, stats:[5,4,3,2], hoveredArc:-1 },
    { delay:30900, phase:13, stats:[5,4,3,2], message:{role:'ai',content:"All assets ready \u2014 let's preview the final video."}, camera:'overview', statsCollapsed:false },
    { delay:32400, phase:13, stats:[5,4,3,2], camera:'editor' },
    { delay:33900, phase:13, stats:[5,4,3,2], showEditor:true }
  ];

  var LOOP_DURATION = 49000;

  /* ── DOM refs ── */
  var section, viewport, world;
  var chatInputEl, chatTextEl, chatSendEl, chatPlaceholder;
  var panelScript, panelOverview;
  var dspConcept, dspGen, dspSettings, dspStory, dspStoryText, dspStoryScroll, dspChars, dspCollapsed;
  var dopStats, dopScene, dopConvBody;
  var editorOverlay, editorVideo, editorPlayhead, editorMsgs;
  var statEls, arcDots, arcLabels;

  /* ── State ── */
  var timeouts = [];
  var typingIv = null, conceptIv = null, storyIv = null;
  var isVisible = false, curPhase = -1;
  var visN = {}, visE = {};

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function renderMentions(t) { return t.replace(/@(\w+)/g, '<span class="demo-chat-mention">@$1</span>'); }

  /* ── Chat focus (hero centered state on empty canvas) ── */
  var appEl, canvasEl;

  function chatFocus() {
    if (!chatInputEl || !appEl) return;
    appEl.classList.add('demo-intro');
    chatInputEl.classList.add('focused');
  }

  function chatUnfocus() {
    if (!chatInputEl || !appEl) return;
    chatInputEl.classList.remove('focused');
    // Stagger: header + panel fade in after input starts moving
    setTimeout(function() {
      appEl.classList.remove('demo-intro');
    }, 400);
  }

  /* ── Camera ── */
  function moveCamera(target) {
    if (!viewport || !world) return;
    var t = CAMERA[target]; if (!t) return;
    var vw = viewport.offsetWidth, vh = viewport.offsetHeight;
    var tx = vw / 2 - t.x * t.zoom;
    var ty = vh / 2 - t.y * t.zoom;
    world.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + t.zoom + ')';
  }

  /* ── Phase ── */
  function applyPhase(phase) {
    if (phase === curPhase) return;
    curPhase = phase;
    var showN = {}, showE = {};
    for (var i = 0; i <= Math.min(phase, PHASES.length - 1); i++) {
      PHASES[i].nodes.forEach(function(id) { showN[id] = true; });
      PHASES[i].edges.forEach(function(id) { showE[id] = true; });
    }
    $$('.dn', world).forEach(function(el) {
      var id = el.getAttribute('data-id');
      if (showN[id]) { if (!visN[id]) { el.classList.add('vis'); visN[id] = true; } }
      else { el.classList.remove('vis'); delete visN[id]; }
    });
    $$('.de', world).forEach(function(el) {
      var id = el.getAttribute('data-id');
      if (showE[id]) { if (!visE[id]) { el.classList.add('vis'); visE[id] = true; } }
      else { el.classList.remove('vis'); delete visE[id]; }
    });
    // Step node status updates (accumulated)
    for (var p = 0; p <= phase; p++) {
      var updates = STEP_UPDATES[p];
      if (!updates) continue;
      Object.keys(updates).forEach(function(nodeId) {
        var el = world.querySelector('[data-id="' + nodeId + '"]');
        if (!el) return;
        if (updates[nodeId].complete) el.classList.add('complete');
      });
    }
  }

  /* ── Stats ── */
  function updateStats(arr) {
    if (!statEls) return;
    ['scenes','characters','sceneRefs','props'].forEach(function(k, i) {
      if (statEls[k]) statEls[k].textContent = arr[i];
    });
  }

  /* ── Chat typing (35ms/char, exact from useDemoSequence.ts) ── */
  function startTyping(text) {
    if (typingIv) clearInterval(typingIv);
    var idx = 0;
    chatPlaceholder.style.display = 'none';
    chatTextEl.innerHTML = '';
    chatSendEl.classList.remove('active');
    typingIv = setInterval(function() {
      idx++;
      if (idx <= text.length) {
        chatTextEl.innerHTML = renderMentions(text.slice(0, idx)) + '<span class="demo-chat-cursor"></span>';
        if (idx > 0) chatSendEl.classList.add('active');
      } else {
        clearInterval(typingIv); typingIv = null;
        chatTextEl.innerHTML = renderMentions(text);
        chatSendEl.classList.add('active');
      }
    }, 35);
  }
  function clearInput() {
    if (typingIv) { clearInterval(typingIv); typingIv = null; }
    chatTextEl.innerHTML = '';
    chatPlaceholder.style.display = '';
    chatSendEl.classList.remove('active');
  }

  /* ── Messages ── */
  function addMessage(msg) {
    if (!dopConvBody) return;
    // Remove empty state
    var empty = dopConvBody.querySelector('.dop-conv-empty');
    if (empty) empty.remove();
    var d = document.createElement('div');
    d.className = 'dm';
    if (msg.role === 'user') {
      d.innerHTML = '<div class="dm-user">' + renderMentions(msg.content) + '</div>';
    } else {
      d.innerHTML = '<div class="dm-ai">' + msg.content + '</div>';
    }
    dopConvBody.appendChild(d);
    dopConvBody.scrollTop = dopConvBody.scrollHeight;
    // Ensure scroll after render
    setTimeout(function() { dopConvBody.scrollTop = dopConvBody.scrollHeight; }, 50);
  }

  /* ── Panel switching ── */
  function setPanel(mode) {
    if (mode === 'script') {
      panelScript.classList.remove('hidden');
      panelOverview.classList.add('hidden');
    } else {
      panelOverview.classList.remove('hidden');
      panelScript.classList.add('hidden');
    }
  }

  /* ── Script panel (exact from DemoScriptPanel.tsx) ── */
  function setScriptPhase(phase) {
    if (!dspConcept) return;
    // Concept typing at phase 1 (35ms/char)
    if (phase === 1) {
      if (conceptIv) clearInterval(conceptIv);
      var ci = 0;
      dspConcept.innerHTML = '';
      conceptIv = setInterval(function() {
        ci++;
        if (ci <= CONCEPT_TEXT.length) {
          dspConcept.innerHTML = CONCEPT_TEXT.slice(0, ci) + '<span class="demo-chat-cursor"></span>';
        } else {
          clearInterval(conceptIv); conceptIv = null;
          dspConcept.textContent = CONCEPT_TEXT;
        }
      }, 35);
    } else if (phase >= 2) {
      if (conceptIv) { clearInterval(conceptIv); conceptIv = null; }
      dspConcept.textContent = CONCEPT_TEXT;
    }
    // Style select at phase 2
    if (phase >= 2) {
      $$('.dsp-sty', panelScript).forEach(function(el) {
        el.classList.toggle('sel', el.getAttribute('data-s') === 'historical');
      });
      dspGen.classList.add('active');
    }
    // Story streaming at phase 3 (20ms/3-chars, exact)
    if (phase >= 3) {
      dspSettings.classList.add('collapsed');
      dspCollapsed.classList.add('vis');
      dspStory.classList.add('vis');
      dspChars.textContent = '1,952 chars';
      if (storyIv) clearInterval(storyIv);
      var si = 0;
      dspStoryText.innerHTML = '';
      storyIv = setInterval(function() {
        si += 3;
        if (si <= STORY_TEXT.length) {
          dspStoryText.innerHTML = STORY_TEXT.slice(0, si).replace(/\n/g, '<br>') + '<span class="demo-chat-cursor"></span>';
          if (dspStoryScroll) dspStoryScroll.scrollTop = dspStoryScroll.scrollHeight;
        } else {
          dspStoryText.innerHTML = STORY_TEXT.replace(/\n/g, '<br>');
          clearInterval(storyIv); storyIv = null;
        }
      }, 20);
    }
  }

  /* ── Stats collapsed ── */
  function setStatsCollapsed(v) {
    if (!dopStats) return;
    dopStats.classList.toggle('collapsed', v);
  }

  /* ── Arc hover ── */
  function setArcHover(idx) {
    if (arcDots) arcDots.forEach(function(d, i) { d.classList.toggle('hovered', i === idx); });
    if (arcLabels) arcLabels.forEach(function(l, i) { l.classList.toggle('vis', i === idx); });
    if (idx >= 0 && idx < SCENES.length) showSceneDetail(idx);
    else hideSceneDetail();
  }
  function showSceneDetail(idx) {
    if (!dopScene) return;
    var s = SCENES[idx], cl = s.tension >= 80;
    dopScene.innerHTML =
      '<div class="dop-scene-head"><span class="dop-scene-lbl">Scene Detail</span><span class="dop-scene-cnt">'+(idx+1)+' / '+SCENES.length+'</span></div>' +
      '<div class="dop-scene-card'+(cl?' climax':'')+'">' +
        '<p class="dop-scene-name">'+s.title+'</p>' +
        '<div class="dop-scene-loc"><div class="dop-scene-loc-dot"></div><span class="dop-scene-loc-text">'+s.location+'</span></div>' +
        '<div class="dop-scene-chars">'+s.characters.map(function(c){return '<span class="dop-scene-char">'+c+'</span>';}).join('')+'</div>' +
        '<p class="dop-scene-text">'+s.content+'</p>' +
        '<div class="dop-scene-tension"><span class="dop-scene-tension-lbl">Tension</span><div class="dop-scene-tension-bar"><div class="dop-scene-tension-fill" style="width:'+s.tension+'%"></div></div><span class="dop-scene-tension-val">'+s.tension+'</span></div>' +
      '</div>';
    dopScene.classList.add('vis');
  }
  function hideSceneDetail() { if (dopScene) dopScene.classList.remove('vis'); }

  /* ── Editor overlay (exact from EditorOverlay in DemoCanvas.tsx) ── */
  function showEditor() {
    if (!editorOverlay) return;
    editorOverlay.classList.add('vis');
    // Load deferred video src and play after 700ms
    if (editorVideo) {
      if (!editorVideo.src && editorVideo.dataset.src) {
        editorVideo.src = editorVideo.dataset.src;
      }
      setTimeout(function() { editorVideo.play().catch(function(){}); }, 700);
    }
    // Stagger chat messages (1500 + i*1800, exact)
    if (editorMsgs) {
      $$('.de-msg', editorMsgs).forEach(function(m, i) {
        setTimeout(function() {
          m.classList.add('vis');
          editorMsgs.scrollTop = editorMsgs.scrollHeight;
        }, 1500 + i * 1800);
      });
    }
    // Playhead tracking
    if (editorVideo && editorPlayhead) {
      editorVideo.addEventListener('timeupdate', function() {
        if (editorVideo.duration) editorPlayhead.style.left = (editorVideo.currentTime / editorVideo.duration * 100) + '%';
      });
    }
  }

  /* ── Reset ── */
  function resetAll() {
    timeouts.forEach(clearTimeout); timeouts = [];
    if (typingIv) { clearInterval(typingIv); typingIv = null; }
    if (conceptIv) { clearInterval(conceptIv); conceptIv = null; }
    if (storyIv) { clearInterval(storyIv); storyIv = null; }
    curPhase = -1; visN = {}; visE = {};
    $$('.dn', world).forEach(function(el) { el.classList.remove('vis'); });
    $$('.dn-step', world).forEach(function(el) { el.classList.remove('complete'); });
    $$('.de', world).forEach(function(el) { el.classList.remove('vis'); });
    if (chatInputEl) chatInputEl.classList.remove('focused');
    if (appEl) appEl.classList.remove('demo-intro');
    if (chatTextEl) chatTextEl.innerHTML = '';
    if (chatPlaceholder) chatPlaceholder.style.display = '';
    if (chatSendEl) chatSendEl.classList.remove('active');
    if (panelScript) panelScript.classList.add('hidden');
    if (panelOverview) panelOverview.classList.remove('hidden');
    if (dspConcept) dspConcept.innerHTML = '<span class="dsp-concept-ph">Describe your story in a few sentences...</span>';
    if (dspSettings) dspSettings.classList.remove('collapsed');
    if (dspStory) dspStory.classList.remove('vis');
    if (dspGen) dspGen.classList.remove('active');
    if (dspChars) dspChars.textContent = '';
    if (dspCollapsed) dspCollapsed.classList.remove('vis');
    if (dspStoryText) dspStoryText.innerHTML = '';
    $$('.dsp-sty', panelScript).forEach(function(el) { el.classList.remove('sel'); });
    updateStats([0,0,0,0]);
    if (dopStats) dopStats.classList.remove('collapsed');
    hideSceneDetail();
    if (arcDots) arcDots.forEach(function(d) { d.classList.remove('hovered'); });
    if (arcLabels) arcLabels.forEach(function(l) { l.classList.remove('vis'); });
    if (dopConvBody) dopConvBody.innerHTML = '<div class="dop-conv-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.912 5.813h6.126l-4.963 3.574L17 18.2l-5-3.574L7 18.2l1.925-5.813L3.962 8.813h6.126z"/></svg><div class="dop-conv-empty-text">No messages yet</div></div>';
    if (editorOverlay) { editorOverlay.classList.remove('vis'); $$('.de-msg', editorOverlay).forEach(function(m) { m.classList.remove('vis'); }); }
    if (editorVideo) { editorVideo.pause(); editorVideo.currentTime = 0; }
    if (editorPlayhead) editorPlayhead.style.left = '0%';
  }

  /* ── Sequence ── */
  function runSequence() {
    resetAll();
    moveCamera('fit');
    TIMELINE.forEach(function(step) {
      var t = setTimeout(function() {
        if (!isVisible) return;
        applyPhase(step.phase);
        if (step.stats) updateStats(step.stats);
        if (step.rightPanel) setPanel(step.rightPanel);
        if (step.scriptPhase !== undefined) setScriptPhase(step.scriptPhase);
        if (step.statsCollapsed !== undefined) setStatsCollapsed(step.statsCollapsed);
        if (step.chatFocus) chatFocus();
        if (step.startTyping) startTyping(step.startTyping);
        if (step.chatUnfocus) chatUnfocus();
        if (step.clearInput) clearInput();
        if (step.message) addMessage(step.message);
        if (step.hoveredArc !== undefined) setArcHover(step.hoveredArc);
        if (step.showEditor) showEditor();
        if (step.camera) setTimeout(function() { moveCamera(step.camera); }, 80);
      }, step.delay);
      timeouts.push(t);
    });
    timeouts.push(setTimeout(function() { if (isVisible) runSequence(); }, LOOP_DURATION));
  }

  /* ── Init ── */
  function init() {
    section = document.getElementById('demo');
    if (!section) return;
    viewport = $('.demo-canvas-viewport', section);
    world = $('.demo-canvas-world', section);
    appEl = $('.demo-app', section);
    canvasEl = $('.demo-canvas', section);
    chatInputEl = $('.demo-chat-input', section);
    // Move chat input to demo-app level permanently (for seamless focus animation)
    if (appEl && chatInputEl) appEl.appendChild(chatInputEl);
    chatTextEl = $('.demo-chat-typed', section);
    chatSendEl = $('.demo-chat-send', section);
    chatPlaceholder = $('.demo-chat-placeholder', section);
    panelScript = $('.demo-panel-script', section);
    panelOverview = $('.demo-panel-overview', section);
    dspConcept = $('.dsp-concept', section);
    dspGen = $('.dsp-gen', section);
    dspSettings = $('.dsp-settings', section);
    dspStory = $('.dsp-story', section);
    dspStoryText = $('.dsp-story-text', section);
    dspStoryScroll = $('.dsp-story-scroll', section);
    dspChars = $('.dsp-chars', section);
    dspCollapsed = $('.dsp-collapsed', section);
    dopStats = $('.dop-stats', section);
    dopScene = $('.dop-scene', section);
    dopConvBody = $('.dop-conv-body', section);
    editorOverlay = $('.demo-editor', section);
    editorVideo = $('.de-vid', section);
    editorPlayhead = $('.de-playhead', section);
    editorMsgs = $('.de-msgs', section);
    statEls = {
      scenes: $('#demo-stat-scenes'),
      characters: $('#demo-stat-characters'),
      sceneRefs: $('#demo-stat-sceneRefs'),
      props: $('#demo-stat-props')
    };
    arcDots = $$('.dn-arc-dot', section);
    arcLabels = $$('.dn-arc-label-text', section);

    // Generate waveform
    var wf = $('#demo-waveform');
    if (wf) for (var j = 0; j < 80; j++) {
      var b = document.createElement('div');
      b.className = 'de-wave-bar';
      b.style.height = (2 + Math.sin(j * 0.5) * 4 + Math.cos(j * 1.1) * 2) + 'px';
      wf.appendChild(b);
    }

    // Start collapsed (only chat-input visible at bottom)
    // On mobile, skip collapse since there's no morph to trigger the explosion
    var isMobile = window.innerWidth < 810;
    if (!isMobile && appEl) {
      appEl.classList.add('collapsed');
    }

    // Expose resetAll globally for palette.js morph reverse
    window._demoReset = resetAll;

    // Track whether the morph explosion has happened
    // Mobile: always active (no morph), Desktop: wait for morph
    var hasExploded = isMobile;

    // Activate demo when section scrolls into view (visibility only, not initial activation)
    var demoIO = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          // Only resume if already exploded (don't auto-start)
          if (hasExploded) {
            section.classList.add('active');
            if (!isVisible) { isVisible = true; runSequence(); }
          }
        } else {
          if (hasExploded) {
            section.classList.remove('active');
            if (isVisible) { isVisible = false; resetAll(); }
          }
        }
      });
    }, { threshold: 0.3 });
    demoIO.observe(section);

    // Morph complete: initial explosion
    window.addEventListener('hero-morph-complete', function() {
      if (!appEl) return;
      hasExploded = true;
      appEl.classList.remove('collapsed');
      appEl.classList.add('expanded');

      // After explosion animation completes, start the demo sequence
      setTimeout(function() {
        section.classList.add('active');
        isVisible = true;
        runSequence();
      }, 800);
    });

    // Morph reverse: collapse back
    window.addEventListener('hero-morph-reverse', function() {
      if (!appEl) return;
      hasExploded = false;
      appEl.classList.remove('expanded');
      appEl.classList.add('collapsed');
      section.classList.remove('active');
      if (isVisible) { isVisible = false; resetAll(); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
