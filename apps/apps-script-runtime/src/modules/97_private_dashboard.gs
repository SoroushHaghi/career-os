const CAREER_OS_DASHBOARD_REFRESH_MS =
  5000;

function careerOsPrivateDashboardQueueItem_(
  job,
  sourceType
) {
  return {
    sourceType:
      String(
        sourceType ||
        ''
      ),
    name:
      String(
        job &&
        job.name ||
        ''
      )
        .substring(
          0,
          180
        ),
    status:
      String(
        job &&
        job.status ||
        'QUEUED'
      )
        .substring(
          0,
          80
        ),
    attempts:
      Math.max(
        0,
        Number(
          job &&
          job.attempts ||
          0
        )
      ),
    nextAttemptAt:
      Math.max(
        0,
        Number(
          job &&
          job.nextAttemptAt ||
          0
        )
      ),
    lastError:
      String(
        job &&
        job.lastError ||
        ''
      )
        .substring(
          0,
          240
        )
  };
}

function careerOsPrivateDashboardLaneState_(
  lane,
  queue
) {
  const props =
    PropertiesService
      .getScriptProperties();

  const leaseKey =
    careerOsWorkerLeaseKey_(
      lane
    );

  const lease =
    careerOsRuntimeSafeJsonParse_(
      props.getProperty(
        leaseKey
      ),
      null
    );

  const now =
    Date.now();

  const active =
    Boolean(
      lease &&
      Number(
        lease.expiresAt ||
        0
      ) > now
    );

  const first =
    queue &&
    queue.length
      ? queue[0]
      : null;

  return {
    lane:
      lane,
    state:
      active
        ? 'RUNNING'
        : (
            queue &&
            queue.length
              ? 'PENDING'
              : 'IDLE'
          ),
    queueCount:
      queue
        ? queue.length
        : 0,
    currentName:
      first &&
      first.name ||
      '',
    nextAttemptAt:
      first
        ? Number(
            first.nextAttemptAt ||
            0
          )
        : 0,
    attempts:
      first
        ? Number(
            first.attempts ||
            0
          )
        : 0,
    leaseExpiresUtc:
      active
        ? new Date(
            Number(
              lease.expiresAt
            )
          )
            .toISOString()
        : ''
  };
}

function careerOsPrivateDashboardEngineeringState_() {
  const cache =
    CacheService
      .getScriptCache();

  const props =
    PropertiesService
      .getScriptProperties();

  const cacheKey =
    'career_os_dashboard_github_runs_v1';

  const durableKey =
    'CAREER_OS_DASHBOARD_GITHUB_RUNS_LAST_GOOD';

  const cached =
    cache.get(
      cacheKey
    );

  if (cached) {
    return careerOsRuntimeSafeJsonParse_(
      cached,
      {
        ok: false,
        runs: []
      }
    );
  }

  function lastGoodOrEmpty_(
    errorState
  ) {
    const lastGood =
      careerOsRuntimeSafeJsonParse_(
        props.getProperty(
          durableKey
        ),
        null
      );

    if (
      lastGood &&
      Array.isArray(
        lastGood.runs
      ) &&
      lastGood.runs.length
    ) {
      return Object.assign(
        {},
        lastGood,
        {
          ok: true,
          stale: true,
          liveError:
            errorState || null
        }
      );
    }

    return Object.assign(
      {
        ok: false,
        runs: []
      },
      errorState || {}
    );
  }

  try {
    const response =
      UrlFetchApp.fetch(
        'https://api.github.com/repos/SoroushHaghi/career-os/actions/runs?branch=vnext&per_page=8',
        {
          method: 'get',
          headers: {
            Accept:
              'application/vnd.github+json',
            'User-Agent':
              'career-os-private-dashboard'
          },
          muteHttpExceptions:
            true
        }
      );

    const status =
      Number(
        response.getResponseCode()
      );

    if (
      status < 200 ||
      status >= 300
    ) {
      return lastGoodOrEmpty_(
        {
          httpStatus:
            status
        }
      );
    }

    const parsed =
      JSON.parse(
        response.getContentText()
      );

    const state = {
      ok: true,
      stale: false,
      fetchedUtc:
        new Date()
          .toISOString(),
      runs:
        (parsed.workflow_runs || [])
          .slice(0, 8)
          .map(
            function(run) {
              return {
                name:
                  String(
                    run.name || ''
                  )
                    .substring(
                      0,
                      120
                    ),
                status:
                  String(
                    run.status || ''
                  ),
                conclusion:
                  String(
                    run.conclusion || ''
                  ),
                sha:
                  String(
                    run.head_sha || ''
                  )
                    .substring(
                      0,
                      8
                    ),
                event:
                  String(
                    run.event || ''
                  ),
                updatedAt:
                  String(
                    run.updated_at || ''
                  )
              };
            }
          )
    };

    cache.put(
      cacheKey,
      JSON.stringify(
        state
      ),
      30
    );

    props.setProperty(
      durableKey,
      JSON.stringify(
        state
      )
    );

    return state;
  } catch (error) {
    return lastGoodOrEmpty_(
      {
        error:
          String(
            error &&
            error.message
              ? error.message
              : error
          )
            .substring(
              0,
              200
            )
      }
    );
  }
}

function careerOsPrivateDashboardAssistantStatus_() {
  try {
    const runtimeFolders =
      DriveApp
        .getFoldersByName(
          '00_CAREER_OS_RUNTIME'
        );

    while (
      runtimeFolders.hasNext()
    ) {
      const folder =
        runtimeFolders.next();

      const files =
        folder
          .getFilesByName(
            '_CAREER_OS_ASSISTANT_LIVE_STATUS'
          );

      if (!files.hasNext()) {
        continue;
      }

      const file =
        files.next();

      const raw =
        String(
          DocumentApp
            .openById(
              file.getId()
            )
            .getBody()
            .getText() ||
          ''
        )
          .trim();

      if (!raw) {
        return null;
      }

      const parsed =
        JSON.parse(
          raw
        );

      function safeArray(value) {
        return Array.isArray(value)
          ? value
              .slice(0, 8)
              .map(
                function(item) {
                  return String(
                    item || ''
                  )
                    .substring(
                      0,
                      260
                    );
                }
              )
          : [];
      }

      return {
        status:
          String(
            parsed.status ||
            ''
          )
            .substring(
              0,
              40
            ),
        focus:
          String(
            parsed.focus ||
            ''
          )
            .substring(
              0,
              320
            ),
        currentStep:
          String(
            parsed.currentStep ||
            ''
          )
            .substring(
              0,
              420
            ),
        why:
          String(
            parsed.why ||
            ''
          )
            .substring(
              0,
              420
            ),
        blocker:
          String(
            parsed.blocker ||
            ''
          )
            .substring(
              0,
              320
            ),
        running:
          safeArray(
            parsed.running
          ),
        pending:
          safeArray(
            parsed.pending
          ),
        recent:
          safeArray(
            parsed.recent
          ),
        sourceModifiedUtc:
          file
            .getLastUpdated()
            .toISOString()
      };
    }

    return null;
  } catch (error) {
    return {
      status:
        'ERROR',
      focus:
        'Assistant live-status read failed',
      currentStep:
        '',
      why:
        '',
      blocker:
        String(
          error &&
          error.message
            ? error.message
            : error
        )
          .substring(
            0,
            300
          ),
      running: [],
      pending: [],
      recent: []
    };
  }
}

function careerOsPrivateDashboardSnapshot_() {
  const props =
    PropertiesService
      .getScriptProperties();

  const imageQueue =
    loadImageQueue_();

  const audioQueue =
    loadAudioQueue_();

  const currentActivity =
    careerOsRuntimeSafeJsonParse_(
      props.getProperty(
        CAREER_OS_RUNTIME_CURRENT_ACTIVITY_PROPERTY
      ),
      null
    );

  const lastActivity =
    careerOsRuntimeSafeJsonParse_(
      props.getProperty(
        CAREER_OS_RUNTIME_LAST_ACTIVITY_PROPERTY
      ),
      null
    );

  const providerTelemetry =
    careerOsProviderTelemetryState_();

  const geminiBackoffUntil =
    getGlobalGeminiBackoffUntil_();

  const environment =
    careerOsRuntimeEnvironment_();

  const totalQueue =
    imageQueue.length +
    audioQueue.length;

  const build =
    typeof getCareerOsBuildInfo ===
      'function'
      ? getCareerOsBuildInfo()
      : CAREER_OS_BUILD_INFO;

  return {
    schemaVersion:
      'career-os-private-dashboard-v1',
    serverTimeUtc:
      new Date()
        .toISOString(),
    refreshMs:
      CAREER_OS_DASHBOARD_REFRESH_MS,
    environment:
      environment,
    build:
      build || {},
    runtime: {
      lanes: {
        image:
          careerOsPrivateDashboardLaneState_(
            'image',
            imageQueue
          ),
        audio:
          careerOsPrivateDashboardLaneState_(
            'audio',
            audioQueue
          )
      },
      scanner:
        careerOsRuntimeAllowsScanner_()
          ? 'ENABLED'
          : 'BLOCKED',
      worker:
        careerOsRuntimeAllowsWorker_()
          ? 'ENABLED'
          : 'BLOCKED',
      triggerMutation:
        careerOsRuntimeAllowsTriggerMutation_()
          ? 'ENABLED'
          : 'BLOCKED',
      freeOnly:
        Boolean(
          CAREER_OS_CONFIG
            .FREE_ONLY_MODE
        ),
      currentActivity:
        currentActivity,
      lastActivity:
        lastActivity
    },
    queues: {
      total:
        totalQueue,
      imageCount:
        imageQueue.length,
      audioCount:
        audioQueue.length,
      image:
        imageQueue
          .slice(
            0,
            8
          )
          .map(
            function(job) {
              return careerOsPrivateDashboardQueueItem_(
                job,
                'image'
              );
            }
          ),
      audio:
        audioQueue
          .slice(
            0,
            8
          )
          .map(
            function(job) {
              return careerOsPrivateDashboardQueueItem_(
                job,
                'audio'
              );
            }
          )
    },
    providers: {
      configuredAudio:
        careerOsGetAudioTranscriptionProvider_(),
      geminiBackoffUntil:
        geminiBackoffUntil > Date.now()
          ? new Date(
              geminiBackoffUntil
            )
              .toISOString()
          : '',
      geminiQuota429Streak:
        getGeminiQuota429Streak_(),
      geminiQuotaCircuitLevel:
        getGeminiQuotaCircuitLevel_(),
      telemetry:
        providerTelemetry
    },
    assistant:
      careerOsPrivateDashboardAssistantStatus_(),
    engineering:
      careerOsPrivateDashboardEngineeringState_(),
    pipeline: {
      ingestion:
        currentActivity ||
        totalQueue > 0
          ? 'ACTIVE'
          : 'IDLE',
      synthesis:
        'NOT_ACTIVE_YET',
      verification:
        'NOT_ACTIVE_YET',
      promotion:
        'NOT_ACTIVE_YET'
    }
  };
}

function getCareerOsPrivateDashboardSnapshot() {
  return careerOsPrivateDashboardSnapshot_();
}

function doGet() {
  return HtmlService
    .createHtmlOutput(
      careerOsPrivateDashboardHtml_()
    )
    .setTitle(
      'Career OS Live'
    );
}

function careerOsPrivateDashboardHtml_() {
  return '<!doctype html>' +
'<html><head><meta charset="utf-8">' +
'<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
'<meta name="theme-color" content="#0b0d12">' +
'<style>' +
':root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color-scheme:dark;background:#0b0d12;color:#f5f7fb}' +
'*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at top left,#1d2946 0,transparent 42%),radial-gradient(circle at top right,#203d34 0,transparent 34%),#0b0d12}' +
'.wrap{max-width:1120px;margin:0 auto;padding:18px 14px 52px}.top{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;margin-bottom:16px}.title{font-size:28px;font-weight:760;letter-spacing:-.03em}.sub{margin-top:4px;color:#a8b0c0;font-size:13px}' +
'.badge{display:inline-flex;align-items:center;gap:7px;border:1px solid #ffffff1c;background:#ffffff0c;border-radius:999px;padding:8px 11px;font-size:12px;white-space:nowrap}.dot{width:8px;height:8px;border-radius:50%;background:#6ee7a8;box-shadow:0 0 14px #6ee7a8}.offline .dot{background:#f0b45d;box-shadow:0 0 14px #f0b45d}' +
'.grid{display:grid;grid-template-columns:repeat(12,1fr);gap:12px}.card{grid-column:span 4;border:1px solid #ffffff17;background:#11151dcc;backdrop-filter:blur(18px);border-radius:18px;padding:15px;box-shadow:0 18px 50px #00000026}.wide{grid-column:span 8}.full{grid-column:1/-1}' +
'.h{font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#8d98aa;margin-bottom:12px}.kv{display:grid;grid-template-columns:1fr auto;gap:7px 12px;font-size:13px}.k{color:#9ba5b6}.v{text-align:right;font-variant-numeric:tabular-nums}.strong{font-weight:680}.ok{color:#77e7aa}.warn{color:#f1bd67}.bad{color:#ff8585}.muted{color:#7f8a9d}' +
'.activity{font-size:14px;line-height:1.55}.activity b{font-size:17px}.queue{display:grid;gap:8px}.job{border:1px solid #ffffff12;background:#ffffff08;border-radius:12px;padding:10px}.jobtop{display:flex;justify-content:space-between;gap:10px;font-size:12px}.jobname{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:76%;font-weight:650}.err{margin-top:7px;color:#ff9a9a;font-size:11px;line-height:1.35}' +
'.pipe{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.stage{border:1px solid #ffffff12;background:#ffffff08;border-radius:12px;padding:11px}.stage .n{font-size:11px;color:#8e99aa;margin-bottom:7px}.stage .s{font-size:12px;font-weight:700}.provider{display:grid;gap:8px}.prow{display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:center;border-bottom:1px solid #ffffff0c;padding-bottom:8px;font-size:12px}.prow:last-child{border-bottom:0;padding-bottom:0}' +
'.foot{margin-top:14px;color:#697487;font-size:11px;line-height:1.45}.button{border:1px solid #ffffff20;background:#ffffff0d;color:#fff;border-radius:10px;padding:8px 10px;font:inherit;cursor:pointer}.button:active{transform:translateY(1px)}' +
'@media(max-width:820px){.card,.wide{grid-column:1/-1}.pipe{grid-template-columns:repeat(2,1fr)}.title{font-size:24px}.top{align-items:center}.wrap{padding-top:14px}}' +
'</style></head><body><main class="wrap">' +
'<div class="top"><div><div class="title">Career OS Live</div><div class="sub" id="subtitle">Connecting to private runtime…</div></div><div class="badge" id="netBadge"><span class="dot"></span><span id="netText">LIVE</span></div></div>' +
'<section class="grid">' +
'<article class="card full"><div class="h">Now</div><div class="activity" id="assistantTask"></div></article>' +
'<article class="card wide"><div class="h">Running now</div><div class="queue" id="runningNow"></div></article>' +
'<article class="card"><div class="h">Waiting / next</div><div class="queue" id="waitingNext"></div></article>' +
'<article class="card full"><div class="h">Recent progress</div><div class="queue" id="recentProgress"></div></article>' +
'<article class="card"><div class="h">Runtime</div><div class="kv" id="runtime"></div></article>' +
'<article class="card"><div class="h">Queues</div><div class="kv" id="queueSummary"></div></article>' +
'<article class="card"><div class="h">Fast lanes</div><div class="activity" id="lanes"></div></article>' +
'<article class="card wide"><div class="h">Providers</div><div class="provider" id="providers"></div></article>' +
'<article class="card"><div class="h">Gemini circuit</div><div class="kv" id="circuit"></div></article>' +
'<article class="card full"><div class="h">Pipeline</div><div class="pipe" id="pipeline"></div></article>' +
'<article class="card full"><div class="h">Engineering activity</div><div class="queue" id="engineering"></div></article>' +
'<article class="card full"><div class="h">Queued work</div><div class="queue" id="jobs"></div></article>' +
'</section>' +
'<div class="foot"><button class="button" onclick="refreshNow()">Refresh now</button> &nbsp; Private runtime view. No API keys, prompts, transcripts, or raw source contents are rendered here. Offline mode shows the last successful snapshot and timestamp.</div>' +
'</main><script>' +
'var cacheKey="career_os_private_dashboard_snapshot_v1";var timer=null;' +
'function esc(v){return String(v===undefined||v===null?"":v).replace(/[&<>"\\x27]/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;","\\x22":"&quot;","\\x27":"&#39;"}[c])})}' +
'function shortSha(v){v=String(v||"");return v?v.slice(0,8):"—"}' +
'function fmtUtc(v){if(!v)return"—";var d=new Date(v);return isNaN(d.getTime())?esc(v):d.toLocaleString()}' +
'function age(v){if(!v)return"";var ms=Date.now()-new Date(v).getTime();if(!isFinite(ms))return"";var s=Math.max(0,Math.round(ms/1000));if(s<60)return s+"s ago";var m=Math.round(s/60);if(m<60)return m+"m ago";return Math.round(m/60)+"h ago"}' +
'function statusClass(v){v=String(v||"").toUpperCase();if(/SUCCESS|ENABLED|HEALTHY|IDLE/.test(v))return"ok";if(/ERROR|FAILED|BLOCKED/.test(v))return"bad";return"warn"}' +
'function row(k,v,cls){return"<div class=\\"k\\">"+esc(k)+"</div><div class=\\"v "+(cls||"")+"\\">"+esc(v)+"</div>"}' +
'function setNet(online,label){var b=document.getElementById("netBadge");b.className="badge"+(online?"":" offline");document.getElementById("netText").textContent=label|| (online?"LIVE":"OFFLINE")}' +
'function taskItem(text,status,meta){return"<div class=\\\"job\\\"><div class=\\\"jobtop\\\"><span class=\\\"jobname\\\">"+esc(text)+"</span><span class=\\\""+statusClass(status)+"\\\">"+esc(status)+"</span></div>"+(meta?"<div class=\\\"muted\\\">"+esc(meta)+"</div>":"")+"</div>"}' +
'function render(s,online){if(!s)return;try{localStorage.setItem(cacheKey,JSON.stringify(s))}catch(e){};setNet(online,online?"LIVE":"OFFLINE CACHE");var b=s.build||{};document.getElementById("subtitle").textContent=(s.environment||"unknown")+" · build "+shortSha(b.gitSha)+" · sync "+fmtUtc(s.serverTimeUtc);var aTask=s.assistant||null;var r=s.runtime||{};var lanes=r.lanes||{};var q=s.queues||{};var eState=s.engineering||{};var eng=eState.runs||[];if(aTask){document.getElementById("assistantTask").innerHTML="<b>"+esc(aTask.focus||"No active task")+"</b><br><span class=\\\""+statusClass(aTask.status)+"\\\">"+esc(aTask.status||"—")+"</span>"+(aTask.currentStep?"<div style=\\\"margin-top:8px\\\"><strong>Current step:</strong> "+esc(aTask.currentStep)+"</div>":"")+(aTask.why?"<div class=\\\"muted\\\" style=\\\"margin-top:5px\\\">Why: "+esc(aTask.why)+"</div>":"")+(aTask.blocker?"<div class=\\\"err\\\">Blocker: "+esc(aTask.blocker)+"</div>":"")+(aTask.sourceModifiedUtc?"<div class=\\\"muted\\\" style=\\\"margin-top:7px\\\">Updated "+esc(age(aTask.sourceModifiedUtc))+"</div>":"")}else{document.getElementById("assistantTask").innerHTML="<div class=\\\"muted\\\">No assistant live-status published yet.</div>"}var running=[];(aTask&&aTask.running||[]).forEach(function(x){running.push(taskItem(x,"RUNNING","assistant"))});["audio","image"].forEach(function(n){var x=lanes[n]||{};if(x.state==="RUNNING"){running.push(taskItem(n.toUpperCase()+" fast lane","RUNNING",(x.currentName||"")+" · queue "+(x.queueCount||0)))}});eng.filter(function(x){return x.status==="in_progress"}).forEach(function(x){running.push(taskItem(x.name||"workflow","RUNNING",(x.sha||"")+" · GitHub Actions"))});document.getElementById("runningNow").innerHTML=running.length?running.join(""):"<div class=\\\"muted\\\">Nothing is actively running at this instant.</div>";var waiting=[];(aTask&&aTask.pending||[]).forEach(function(x){waiting.push(taskItem(x,"PENDING","assistant"))});["audio","image"].forEach(function(n){var x=lanes[n]||{};if(x.state==="PENDING"){waiting.push(taskItem(n.toUpperCase()+" fast lane","PENDING",(x.currentName||"")+" · queue "+(x.queueCount||0)))}});eng.filter(function(x){return x.status==="queued"}).forEach(function(x){waiting.push(taskItem(x.name||"workflow","QUEUED",(x.sha||"")+" · GitHub Actions"))});document.getElementById("waitingNext").innerHTML=waiting.length?waiting.slice(0,8).join(""):"<div class=\\\"muted\\\">No explicit pending work.</div>";var recent=[];(aTask&&aTask.recent||[]).slice(0,5).forEach(function(x){recent.push(taskItem(x,"DONE","assistant"))});eng.filter(function(x){return x.status==="completed"}).slice(0,5).forEach(function(x){recent.push(taskItem(x.name||"workflow",x.conclusion||"completed",(x.sha||"")+" · "+(x.updatedAt?age(x.updatedAt):"")))});if(r.lastActivity){recent.push(taskItem((r.lastActivity.kind||"runtime")+" · "+(r.lastActivity.stage||""),r.lastActivity.status||"DONE",r.lastActivity.updatedUtc?age(r.lastActivity.updatedUtc):""))}document.getElementById("recentProgress").innerHTML=recent.length?recent.slice(0,10).join(""):"<div class=\\\"muted\\\">No recent progress recorded.</div>";document.getElementById("runtime").innerHTML=row("Environment",s.environment||"—","strong")+row("Scanner",r.scanner||"—",statusClass(r.scanner))+row("Worker",r.worker||"—",statusClass(r.worker))+row("Free-only",r.freeOnly?"ON":"OFF",r.freeOnly?"ok":"bad")+row("Build",shortSha(b.gitSha),"muted");document.getElementById("queueSummary").innerHTML=row("Total",q.total||0,"strong")+row("Images",q.imageCount||0)+row("Audio",q.audioCount||0);var lh="";["audio","image"].forEach(function(n){var x=lanes[n]||{};lh+="<div class=\\"job\\" style=\\"margin-bottom:8px\\"><div class=\\"jobtop\\"><span class=\\"jobname\\">"+esc(n.toUpperCase())+"</span><span class=\\""+statusClass(x.state)+"\\">"+esc(x.state||"—")+"</span></div><div class=\\"muted\\">queue "+esc(x.queueCount||0)+(x.currentName?" · "+esc(x.currentName):"")+(x.nextAttemptAt?" · next "+fmtUtc(x.nextAttemptAt):"")+"</div></div>"});document.getElementById("lanes").innerHTML=lh||"<div class=\\"muted\\">No lane state yet.</div>";var p=(s.providers||{}).telemetry||{};var names=["tubs_ki_toolbox","gemini","groq"];var ph="";names.forEach(function(n){var x=p[n]||{};var st=x.status||"NO DATA";ph+="<div class=\\"prow\\"><span>"+esc(n)+"</span><span class=\\""+statusClass(st)+"\\">"+esc(st)+"</span><span>"+esc(x.durationMs?x.durationMs+" ms":"—")+"</span></div>"});document.getElementById("providers").innerHTML=ph;var pr=s.providers||{};document.getElementById("circuit").innerHTML=row("Audio provider",pr.configuredAudio||"—")+row("429 streak",pr.geminiQuota429Streak||0)+row("Circuit level",pr.geminiQuotaCircuitLevel||0)+row("Backoff",pr.geminiBackoffUntil?fmtUtc(pr.geminiBackoffUntil):"none",pr.geminiBackoffUntil?"warn":"ok");var pp=s.pipeline||{};var pipe="";[["Ingestion",pp.ingestion],["Synthesis",pp.synthesis],["Verification",pp.verification],["Promotion",pp.promotion]].forEach(function(x){pipe+="<div class=\\"stage\\"><div class=\\"n\\">"+esc(x[0])+"</div><div class=\\"s "+statusClass(x[1])+"\\">"+esc(x[1]||"—")+"</div></div>"});document.getElementById("pipeline").innerHTML=pipe;var eState=s.engineering||{};var eng=eState.runs||[];var stale=eState.stale?"<div class=\"warn\" style=\"margin-bottom:8px\">Live GitHub refresh failed; showing last known activity.</div>":"";document.getElementById("engineering").innerHTML=stale+(eng.length?eng.map(function(x){var st=x.status==="completed"?(x.conclusion||"completed"):x.status;return"<div class=\"job\"><div class=\"jobtop\"><span class=\"jobname\">"+esc(x.name||"workflow")+"</span><span class=\""+statusClass(st)+"\">"+esc(st)+"</span></div><div class=\"muted\">"+esc(x.sha||"")+" · "+esc(x.event||"")+(x.updatedAt?" · "+esc(age(x.updatedAt)):"")+"</div></div>"}).join(""):"<div class=\"muted\">No recent engineering activity available.</div>");var jobs=[].concat(q.image||[],q.audio||[]);document.getElementById("jobs").innerHTML=jobs.length?jobs.map(function(j){return"<div class=\\"job\\"><div class=\\"jobtop\\"><span class=\\"jobname\\">"+esc(j.name||j.sourceType)+"</span><span class=\\""+statusClass(j.status)+"\\">"+esc(j.status)+"</span></div><div class=\\"muted\\">"+esc(j.sourceType)+" · attempts "+esc(j.attempts||0)+(j.nextAttemptAt?" · next "+fmtUtc(j.nextAttemptAt):"")+"</div>"+(j.lastError?"<div class=\\"err\\">"+esc(j.lastError)+"</div>":"")+"</div>"}).join(""):"<div class=\\"muted\\">Queue is empty.</div>"}' +
'function useCache(){try{var x=JSON.parse(localStorage.getItem(cacheKey)||"null");if(x){render(x,false);return}}catch(e){}setNet(false,"OFFLINE");document.getElementById("subtitle").textContent="No cached runtime snapshot available."}' +
'function refreshNow(){if(!(window.google&&google.script&&google.script.run)){useCache();return}google.script.run.withSuccessHandler(function(s){render(s,true)}).withFailureHandler(function(){useCache()}).getCareerOsPrivateDashboardSnapshot()}' +
'refreshNow();timer=setInterval(refreshNow,5000);document.addEventListener("visibilitychange",function(){if(!document.hidden)refreshNow()});' +
'</script></body></html>';
}
