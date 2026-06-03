<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { parseParagraph, splitParagraphs, splitSentences, type TextToken } from '@/utils/wordParser'
import { lookupWord, type WordLookup } from '@/utils/dictionary'
import { translateLine } from '@/utils/lineTranslate'
import { speakWord, speakSentences, stopSpeech } from '@/utils/tts'
import { addWord } from '@/utils/storage'

interface Article { id:string;title:string;wordCount:number;level:string;coverImage:string;content:string;source:string }
const articles:Article[]=[
  {id:'1',title:'How Climate Change Is Reshaping Global Agriculture',wordCount:318,level:'CET-6',coverImage:'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&h=450&fit=crop',content:'Climate change is no longer a distant threat. It is already transforming the way we grow food. Rising temperatures, shifting rainfall patterns, and more frequent extreme weather events are putting global agriculture under unprecedented pressure. In many parts of the world, farmers are waking up to fields that no longer behave the way they once did. Crops that thrived for generations are now struggling. Wheat yields in South Asia have dropped by nearly fifteen percent over the past decade. Coffee farmers in Brazil are moving their plantations to higher altitudes, chasing cooler temperatures that their plants need to survive. But the story is not entirely bleak. Scientists and farmers are working together to develop climate-resilient crops, varieties that can withstand drought, heat, and flooding. Technology is playing an increasingly important role as well. Satellite imaging helps farmers monitor soil moisture from space. Artificial intelligence predicts pest outbreaks before they happen. Still, experts warn that technology alone will not be enough.',source:'The Economist'},
  {id:'2',title:'The Quiet Power of Walking',wordCount:285,level:'CET-4',coverImage:'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=450&fit=crop',content:'For most of human history, walking was simply how we got from one place to another. But modern science is revealing something remarkable. Walking, especially in nature, has profound effects on the human brain. A landmark study from Stanford University found that people who walked for ninety minutes through a natural setting showed significantly lower activity in the part of the brain associated with repetitive negative thoughts. Walking also boosts creativity. In a series of experiments, researchers discovered that people generated nearly twice as many creative ideas while walking compared to sitting. This effect persisted even after the walk ended. The benefits extend far beyond creativity. Regular walking reduces the risk of heart disease, strengthens bones, and improves balance. A brisk daily walk can add up to seven years to your life expectancy.',source:'Stanford Medicine'},
  {id:'3',title:'Why Some People Remember Their Dreams',wordCount:262,level:'CET-6',coverImage:'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&h=450&fit=crop',content:'Every morning, millions of people wake up with vivid memories of strange and wonderful dreams. Others open their eyes and recall nothing at all. What explains this striking difference? Neuroscientists have been studying this question for decades. The answer appears to lie not in how much people dream, but in how easily their brains wake up during the night. Everyone dreams multiple times each night during REM sleep. The difference is that some people wake briefly after each dream cycle, just long enough for the memory to be encoded into conscious recall. Others sleep through these transitions and lose their dreams to the void. Brain scans reveal that high dream recallers have more activity in a region called the temporo-parietal junction. Personality also plays a role. If you want to remember more of your dreams, keep a dream journal by your bed.',source:'Nature Neuroscience'}
]
const ci=ref(0);const ca=computed(()=>articles[ci.value]);const coverFail=ref(false);const sb=ref(20);const sab=ref(0)
interface ContentBlock {id:string;index:number;tokens:TextToken[];plainText:string;translation:string}
const blocks=computed<ContentBlock[]>(()=>{const ps=splitParagraphs(ca.value.content);return ps.map((t,i)=>({id:'b-'+i,index:i,tokens:parseParagraph(t),plainText:t,translation:translateLine(t,i)}))})
const sentences=computed(()=>splitSentences(ca.value.content))

// ---- word card (small bottom card, no overlay blur) ----
const wCard=ref(false);const wCardOn=ref(false)
const lookup=ref<WordLookup|null>(null);const selKey=ref('');const added=ref(false)
function openWord(t:TextToken){if(t.type!=='word'||!t.normalized||t.normalized.length<2)return;selKey.value=t.normalized;lookup.value=lookupWord(t.text);wCard.value=true;added.value=false;nextTick(()=>{wCardOn.value=true})}
function closeWord(){wCardOn.value=false;setTimeout(()=>{wCard.value=false;lookup.value=null;selKey.value='';added.value=false},240)}
function speakIt(){if(lookup.value)speakWord(lookup.value.word)}
function addIt(){if(!lookup.value)return;if(addWord(lookup.value)){uni.showToast({title:'Added',icon:'success'});added.value=true;setTimeout(closeWord,600)}else uni.showToast({title:'Already saved',icon:'none'})}

// ---- line bubble (floating above, copyable) ----
const lBubble=ref(false);const lBubbleOn=ref(false)
const lOrig=ref('');const lTran=ref('')
function openBubble(b:ContentBlock){lOrig.value=b.plainText;lTran.value=b.translation;lBubble.value=true;nextTick(()=>{lBubbleOn.value=true})}
function closeBubble(){lBubbleOn.value=false;setTimeout(()=>{lBubble.value=false;lOrig.value='';lTran.value=''},260)}

const reading=ref(false);const ri=ref(-1)
async function readAloud(){if(reading.value){stopSpeech();reading.value=false;ri.value=-1;return};reading.value=true;ri.value=-1;await speakSentences(sentences.value,{onSentenceStart:(i:number)=>{ri.value=Math.min(i,blocks.value.length-1)},onSentenceEnd:()=>{},onAllEnd:()=>{reading.value=false;ri.value=-1},onError:()=>{uni.showToast({title:'Audio unavailable',icon:'none'})}})}

function prevArticle(){if(ci.value>0){ci.value--;coverFail.value=false}}
function nextArticle(){if(ci.value<articles.length-1){ci.value++;coverFail.value=false}}
onMounted(()=>{const i=uni.getSystemInfoSync();sb.value=i.statusBarHeight??20;sab.value=i.safeAreaInsets?.bottom??0})
onUnmounted(()=>stopSpeech())
function noop(){}
const hlWord=computed(()=>wCard.value?selKey.value:'')
function isHL(t:TextToken):boolean{return t.type==='word'&&!!t.normalized&&t.normalized===hlWord.value}
</script>

<template>
<view class="pg">
  <view class="nv" :style="{paddingTop:sb+'px'}">
    <view class="nv__r"><text class="nv__src">{{ca.source}}</text><text class="nv__lv">{{ca.level}}</text></view>
  </view>

  <scroll-view class="sc" scroll-y :style="{paddingTop:(sb+44)+'px'}">
    <view class="cv" v-if="!coverFail">
      <image class="cv__img" :src="ca.coverImage" mode="aspectFill" @error="coverFail=true" />
      <view class="cv__g" />
      <view class="cv__t"><text class="cv__ti">{{ca.title}}</text><text class="cv__mt">{{ca.wordCount}} words</text></view>
    </view>
    <view class="sw">
      <view class="sw__b" :class="{off:ci===0}" @tap="prevArticle"><text>&larr;</text></view>
      <text class="sw__n">{{ci+1}}/{{articles.length}}</text>
      <view class="sw__b" :class="{off:ci===articles.length-1}" @tap="nextArticle"><text>&rarr;</text></view>
    </view>
    <view class="br">
      <view class="br__l"><text class="br__c">{{ca.wordCount}} words</text><view class="br__tg"><text class="br__tg-t">{{ca.level}}</text></view></view>
      <view class="br__pl" :class="{on:reading}" @tap="readAloud"><text>{{reading?'Stop':'Read aloud'}}</text></view>
    </view>

    <view class="bd">
      <view v-for="b in blocks" :key="b.id" class="bd__b">
        <view class="bd__en">
          <text v-for="t in b.tokens" :key="t.id" class="bd__tk" :class="{'wd':t.type==='word','hl':isHL(t)}" @tap.stop="openWord(t)">{{t.text}}</text>
        </view>
        <!-- long-press triggers the floating bubble -->
        <view class="bd__zh" @longpress="openBubble(b)"><text class="bd__zh-t">{{b.translation}}</text></view>
      </view>
    </view>

    <view :style="{height:(56+sab+32)+'px'}" />
  </scroll-view>

  <view class="bt" :style="{paddingBottom:sab+'px'}">
    <view class="bt__i" @tap="noop"><text class="bt__ic">&#9788;</text></view>
    <view class="bt__i" @tap="noop"><text class="bt__ic aa">Aa</text></view>
    <view class="bt__i" @tap="noop"><text class="bt__ic">&#128218;</text></view>
  </view>

  <!-- WORD CARD: small, bottom, no blur -->
  <view v-if="wCard" class="wcard" :class="{on:wCardOn}">
    <view class="wcard__bar" />
    <view class="wcard__row"><text class="wcard__w">{{lookup?.word}}</text><view class="wcard__sp" @tap="speakIt"><text>&#128266;</text></view></view>
    <text class="wcard__ph">{{lookup?.phonetic}}</text>
    <view class="wcard__df"><text class="wcard__ps">{{lookup?.partOfSpeech}}</text><text class="wcard__mn">{{lookup?.meaning}}</text></view>
    <view class="wcard__ex"><text class="wcard__ex-e">{{lookup?.example}}</text><text class="wcard__ex-z">{{lookup?.exampleTranslation}}</text></view>
    <view class="wcard__act"><view class="wcard__btn" :class="{ok:added}" @tap="addIt"><text>{{added?'Added':'Add to vocab'}}</text></view></view>
  </view>

  <!-- LINE BUBBLE: floating, above content, copyable -->
  <view v-if="lBubble" class="bub" :class="{on:lBubbleOn}">
    <view class="bub__header">
      <text class="bub__hint">Long-press to copy</text>
      <view class="bub__close" @tap="closeBubble"><text>&times;</text></view>
    </view>
    <view class="bub__body">
      <text class="bub__en" selectable="true">{{lOrig}}</text>
      <view class="bub__sep" />
      <text class="bub__zh" selectable="true">{{lTran}}</text>
    </view>
  </view>
</view>
</template>

<style lang="scss" scoped>
$bg0:#0A1510;$bg1:#163224;$bg2:#1F402C;$bg3:#F1F5F2;
$tx:rgba(255,255,255,0.88);$ts:rgba(255,255,255,0.5);$td:rgba(255,255,255,0.3);
$g:#34C759;$go:#D4A853;

.pg{min-height:100vh;background:linear-gradient(175deg,$bg0 0%,$bg1 34%,$bg2 62%,$bg3 100%)}
.nv{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(10,21,16,0.94);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
.nv__r{display:flex;align-items:center;justify-content:space-between;height:44px;padding:0 20px}
.nv__src{font-size:13px;color:$ts;letter-spacing:.4px}
.nv__lv{font-size:11px;color:$go;font-weight:600;border:1px solid rgba(212,168,83,.22);padding:3px 10px;border-radius:10px;letter-spacing:.8px}
.sc{min-height:100vh}
.cv{width:100%;aspect-ratio:16/9;overflow:hidden;position:relative;background:$bg1}
.cv__img{width:100%;height:100%}
.cv__g{position:absolute;inset:0;background:linear-gradient(180deg,transparent 20%,rgba(10,21,16,.15) 45%,rgba(10,21,16,.55) 70%,rgba(10,21,16,.88) 95%)}
.cv__t{position:absolute;bottom:22px;left:20px;right:20px}
.cv__ti{display:block;font-size:25px;font-weight:700;color:#fff;line-height:1.22;letter-spacing:-.3px;margin-bottom:7px;text-shadow:0 2px 20px rgba(0,0,0,.45)}
.cv__mt{font-size:13px;color:$ts;letter-spacing:.3px}
.sw{display:flex;align-items:center;justify-content:center;gap:20px;padding:18px 20px}
.sw__b{width:38px;height:38px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:rgba(255,255,255,.07);@include tap-feedback}
.sw__b.off{opacity:.2;pointer-events:none}
.sw__b text{font-size:17px;color:#fff}
.sw__n{font-size:13px;color:$td;letter-spacing:1px}
.br{display:flex;align-items:center;justify-content:space-between;margin:0 16px;padding:14px 18px;background:rgba(255,255,255,.07);backdrop-filter:blur(10px);border-radius:16px;border:1px solid rgba(255,255,255,.05)}
.br__l{display:flex;align-items:center;gap:10px}
.br__c{font-size:13px;color:$ts}
.br__tg{padding:3px 10px;border-radius:6px;background:rgba($g,.1);border:1px solid rgba($g,.12)}
.br__tg-t{font-size:11px;color:$g;font-weight:600;letter-spacing:.5px}
.br__pl{padding:9px 17px;background:$g;border-radius:20px;color:#fff;font-size:13px;font-weight:600;@include tap-feedback}
.br__pl.on{background:$primary-orange}
.bd{padding:28px 20px}
.bd__b{margin-bottom:28px}
.bd__en{font-size:16px;color:$tx;line-height:1.95;letter-spacing:.1px;margin-bottom:14px}
.bd__tk{}
.bd__tk.wd{transition:background .18s}
.bd__tk.hl{background:rgba($g,.32);border-radius:3px;padding:0 2px}
.bd__zh{padding:11px 0 11px 14px;border-left:2px solid rgba(255,255,255,.06)}
.bd__zh-t{font-size:13px;color:$td;line-height:1.7}
.bt{position:fixed;bottom:0;left:0;right:0;z-index:80;background:rgba(241,245,242,.95);backdrop-filter:blur(12px);border-top:1px solid rgba(0,0,0,.04);display:flex}
.bt__i{flex:1;display:flex;align-items:center;justify-content:center;height:56px;@include tap-feedback}
.bt__ic{font-size:21px;color:$text-primary}
.bt__ic.aa{font-size:17px;font-weight:700;color:$text-primary}

/* WORD CARD: no overlay, small, bottom, sits above bottombar */
.wcard{
  position:fixed;bottom:56px;left:0;right:0;z-index:90;
  background:#fff;border-radius:20px 20px 0 0;
  padding:12px 20px 20px;padding-bottom:calc(20px + env(safe-area-inset-bottom));
  @include card-shadow;
  transform:translateY(100%);transition:transform .28s cubic-bezier(.32,.72,0,1);
}
.wcard.on{transform:translateY(0)}
.wcard__bar{width:32px;height:4px;background:#E0E0E0;border-radius:2px;margin:0 auto 14px}
.wcard__row{display:flex;align-items:center;gap:12px;margin-bottom:4px}
.wcard__w{font-size:26px;font-weight:700;color:$text-highlight}
.wcard__sp{width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:1.5px solid $g;border-radius:50%;font-size:16px;@include tap-feedback}
.wcard__ph{font-size:14px;color:$text-secondary;margin-bottom:12px;display:block}
.wcard__df{display:flex;align-items:flex-start;gap:8px;padding:12px 14px;background:rgba($g,.05);border-radius:10px;margin-bottom:12px}
.wcard__ps{font-size:14px;color:$text-secondary;flex-shrink:0}
.wcard__mn{font-size:14px;color:$text-primary;line-height:1.6;font-weight:500}
.wcard__ex{margin-bottom:16px}
.wcard__ex-e{font-size:13px;color:$text-primary;line-height:1.7;display:block}
.wcard__ex-z{font-size:12px;color:$text-secondary;margin-top:4px;display:block}
.wcard__act{}
.wcard__btn{height:46px;display:flex;align-items:center;justify-content:center;border-radius:23px;font-size:15px;font-weight:600;background:$g;color:#fff;@include tap-feedback}
.wcard__btn.ok{background:rgba($g,.2);color:$g}

/* BUBBLE: floating, centered, copyable */
.bub{
  position:fixed;top:30%;left:20px;right:20px;z-index:200;
  background:rgba(30,30,30,0.96);border-radius:18px;
  padding:14px 18px 18px;
  opacity:0;transform:scale(.94) translateY(-8px);
  transition:opacity .26s ease-out,transform .26s ease-out;
  pointer-events:none;
  @include card-shadow;
}
.bub.on{opacity:1;transform:scale(1) translateY(0);pointer-events:auto}
.bub__header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.bub__hint{font-size:11px;color:rgba(255,255,255,.35)}
.bub__close{width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:20px;color:rgba(255,255,255,.5);@include tap-feedback}
.bub__body{}
.bub__en{font-size:14px;color:rgba(255,255,255,.9);line-height:1.8;display:block;margin-bottom:4px;-webkit-user-select:text;user-select:text}
.bub__sep{height:1px;background:rgba(255,255,255,.1);margin:12px 0}
.bub__zh{font-size:13px;color:rgba(255,255,255,.6);line-height:1.7;display:block;-webkit-user-select:text;user-select:text}
</style>