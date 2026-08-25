/* SpacingOverlay: подсвечивает margin(оранж)/padding(зелён)/gap(синий) поверх страницы,
   красные метки — значения вне шкалы. Горячая клавиша Ctrl+Shift+S. window.__spacingOverlay. */
const APPROVED = [0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128, 160, 192, 256];
class SpacingOverlay {
  constructor(){ this.on=false; this.layer=null; }
  toggle(){ this.on ? this.disable() : this.enable(); }
  enable(){ if(this.on) return; this.on=true;
    this.layer=document.createElement("div");
    this.layer.style.cssText="position:fixed;inset:0;z-index:999998;pointer-events:none;";
    document.body.appendChild(this.layer); this.render();
    window.addEventListener("scroll",()=>this.render(),{passive:true}); }
  disable(){ this.on=false; this.layer?.remove(); this.layer=null; }
  render(){ if(!this.layer) return; this.layer.innerHTML="";
    for(const el of document.querySelectorAll("body *")){
      const r=el.getBoundingClientRect(); if(!r.width&&!r.height) continue;
      if(r.bottom<0||r.top>innerHeight) continue;
      const cs=getComputedStyle(el);
      this.box(r.left,r.top-cs.getPropertyValue?0:0,r,cs);
    } }
  box(l,t,r,cs){ const mk=(x,y,w,h,c,v)=>{ const d=document.createElement("div");
      d.style.cssText=`position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;outline:1px dashed ${c};background:${c}22`;
      this.layer.appendChild(d); if(!APPROVED.includes(Math.round(v))) this.tag(x,y,`${v}px⚠`); };
    const m=parseFloat(cs.marginTop)||0,p=parseFloat(cs.paddingTop)||0;
    if(m>0)mk(l,r.top-m,r.width,m,"#ff6a2b",m);
    if(p>0)mk(l,r.top,r.width,p,"#2e7d4f",p); }
  tag(x,y,txt){ const s=document.createElement("span");
    s.style.cssText="position:absolute;left:"+x+"px;top:"+y+"px;background:#ce2c18;color:#fff;font:600 9px monospace;padding:2px 4px;";
    s.textContent=txt; this.layer.appendChild(s); }
}
window.__spacingOverlay=new SpacingOverlay();
document.addEventListener("keydown",(e)=>{ if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==="s"){ e.preventDefault(); window.__spacingOverlay.toggle(); } });
