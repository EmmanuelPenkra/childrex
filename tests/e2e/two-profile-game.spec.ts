import { expect, test, type BrowserContext, type Page, type TestInfo } from '@playwright/test';

async function shot(page:Page,testInfo:TestInfo,name:string){await page.screenshot({path:testInfo.outputPath(`${name}.png`),animations:'disabled'});}
async function choosePlayable(page:Page){
  const cards=page.locator('.hand-card:not(:disabled)');
  for(let i=0;i<await cards.count();i++){
    await cards.nth(i).click();
    if(await page.locator('.board-cell.valid').count())return;
  }
  throw new Error('No playable card in the current hand');
}
async function close(context:BrowserContext){await context.close().catch(()=>undefined)}

test('two isolated Chrome profiles complete a synchronized room journey',async({browser},testInfo)=>{
  const hostProfile=await browser.newContext({viewport:{width:1280,height:1040},recordVideo:{dir:testInfo.outputPath('host-video'),size:{width:1280,height:1040}},permissions:['clipboard-read','clipboard-write']});
  const guestProfile=await browser.newContext({viewport:{width:1280,height:1040},recordVideo:{dir:testInfo.outputPath('guest-video'),size:{width:1280,height:1040}}});
  const host=await hostProfile.newPage();const guest=await guestProfile.newPage();
  try{
    await host.goto('/sequence/');
    await expect(host.getByRole('heading',{name:'Pick your side'})).toBeVisible();
    await expect(host.locator('.code-badge small')).toHaveText('CODE');
    const code=(await host.locator('.code-badge strong').innerText()).trim();expect(code).toMatch(/^\d{2}$/);
    await shot(host,testInfo,'01-host-neutral-lobby');
    await host.locator('.code-badge').click();await expect(host.getByRole('status')).toHaveText('Invite copied');
    expect(await host.evaluate(()=>navigator.clipboard.readText())).toMatch(new RegExp(`/sequence/join\\?code=${code}&room=[0-9a-f-]+$`));

    await host.locator('.team-panel').nth(0).getByLabel('Select blue').click();
    await host.locator('.team-panel').nth(1).getByLabel('Select red').click();
    await host.locator('.avatar-button').click();
    await expect(host.locator('.team-panel').nth(0).locator('.player')).toHaveCount(1);
    await expect(host.getByRole('heading',{name:'Choose your avatar'})).toBeVisible();
    await host.getByLabel('Avatar 6').click();
    await host.locator('.player-name').dblclick();
    await host.getByLabel('Player name').fill('Amara');await host.getByLabel('Player name').press('Enter');
    await expect(host.locator('.player').first()).toHaveAttribute('title',/Amara/);

    await guest.goto(`/sequence/join?code=${code}`);
    await expect(guest.getByRole('heading',{name:'Enter the game code'})).toBeVisible();
    await expect(guest.getByRole('textbox',{name:'Game code'})).toHaveValue(code);
    await expect(guest.getByRole('button',{name:/Join game/})).toBeEnabled();
    await shot(guest,testInfo,'02-join-game');
    await guest.getByRole('button',{name:/Join game/}).click();
    await expect(guest.getByRole('heading',{name:'Pick your side'})).toBeVisible();
    await expect(host.locator('.player')).toHaveCount(2);
    await expect(guest.locator('.player')).toHaveCount(2);
    await shot(host,testInfo,'02-host-balanced-lobby');await shot(guest,testInfo,'03-guest-balanced-lobby');

    await expect(host.getByRole('button',{name:/Start game/})).toBeEnabled();
    await host.getByRole('button',{name:/Start game/}).click();
    await expect(host.locator('.board-grid')).toBeVisible();await expect(guest.locator('.board-grid')).toBeVisible();
    await expect(host.locator('.board-cell')).toHaveCount(100);await expect(host.locator('.hand-card')).toHaveCount(7);
    expect(await host.locator('.board-cell img,.hand-card img').evaluateAll(images=>images.every(image=>(image as HTMLImageElement).complete&&(image as HTMLImageElement).naturalWidth>0))).toBe(true);
    expect(await guest.locator('.board-cell img,.hand-card img').evaluateAll(images=>images.every(image=>(image as HTMLImageElement).complete&&(image as HTMLImageElement).naturalWidth>0))).toBe(true);
    await expect(host.getByRole('status')).toHaveCount(0);
    await expect(host.locator('.game-top')).toHaveCSS('height','88px');
    await expect(host.locator('.board-wrap')).toHaveCSS('width','998px');await expect(host.locator('.board-wrap')).toHaveCSS('height','800px');
    await expect(host.locator('.hand')).toHaveCSS('height','112px');
    await shot(host,testInfo,'04-host-game-rest');await shot(guest,testInfo,'05-guest-game-rest');

    const hostIsCurrent=(await host.locator('.player.current .player-name').innerText())==='You';
    const mover=hostIsCurrent?host:guest;const observer=hostIsCurrent?guest:host;
    await choosePlayable(mover);
    await expect(mover.locator('.hand-card.selected')).toHaveCount(1);
    await expect(mover.locator('.board-cell.valid').first()).toBeVisible();
    expect(await mover.locator('.board-cell.valid').first().evaluate(element=>{const style=getComputedStyle(element,'::after');return{radius:style.borderRadius,width:style.borderTopWidth}})).toEqual({radius:'2.08px',width:'1px'});
    await expect(mover.locator('.hand-card.selected')).toHaveCSS('transform','matrix(1, 0, 0, 1, 0, -6)');
    await shot(mover,testInfo,'06-selected-valid-moves');
    await mover.locator('.board-cell.valid').first().click();
    await expect(mover.locator('.board-cell.last')).toHaveCount(1);await expect(observer.locator('.board-cell.last')).toHaveCount(1);
    await expect(mover.locator('.hand-card.selected')).toHaveCount(0);
    await shot(mover,testInfo,'07-move-committed');await shot(observer,testInfo,'08-move-synchronized');

    await host.getByRole('button',{name:'Menu'}).click();await expect(host.getByRole('dialog',{name:'Game menu'})).toBeVisible();
    await host.getByRole('switch',{name:/Sound/}).click();await expect(host.getByRole('switch',{name:/Sound/}).locator('.switch')).toHaveClass(/on/);
    await shot(host,testInfo,'09-menu-overlay');await host.locator('.menu-scrim').click({position:{x:100,y:500}});await expect(host.getByRole('dialog',{name:'Game menu'})).toBeHidden();
    await host.getByRole('button',{name:'Menu'}).click();await host.getByRole('button',{name:'How to play'}).click();
    await expect(host.getByRole('heading',{name:'Make a sequence of five.'})).toBeVisible();await expect(host.getByText('Two-eyed Jacks')).toBeVisible();await host.getByRole('button',{name:'Close'}).click();
    await host.getByRole('button',{name:'Menu'}).click();await host.getByRole('button',{name:'New game'}).click();
    await expect(host.getByRole('heading',{name:'Start a new game?'})).toBeVisible();await host.getByRole('button',{name:'Stay'}).click();

    const roomId=await host.evaluate(async()=>{const session=await fetch('/sequence/api/session',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}).then(r=>r.json());return session.room.id});
    await host.evaluate(async id=>{await fetch('/sequence/api/test/fixture',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({roomId:id,kind:'sequence'})})},roomId);
    await expect(host.locator('.board-cell.sequence-cell')).toHaveCount(5);await expect(guest.locator('.board-cell.sequence-cell')).toHaveCount(5);
    await expect(host.locator('.player.current')).toHaveCount(1);
    await expect(host.locator('.player').filter({hasText:'Sequence made'})).toHaveCount(1);
    await shot(host,testInfo,'10-completed-sequence-next-turn');

    await host.evaluate(async id=>{await fetch('/sequence/api/test/fixture',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({roomId:id,kind:'win'})})},roomId);
    await expect(host.getByText(/GAME OVER · .* WINS/)).toBeVisible();await expect(guest.getByText(/GAME OVER · .* WINS/)).toBeVisible();
    await expect(host.locator('.sequence-reveal>i')).toHaveCount(9);await expect(guest.locator('.sequence-reveal>i')).toHaveCount(9);
    await expect(host.locator('.result-copy>p').last()).toContainText('closed out two sequences');
    await shot(host,testInfo,'11-winner-overlay');await shot(guest,testInfo,'12-result-other-profile');
    await guest.getByRole('button',{name:/Replay/}).click();
    await expect(host.getByText(/GAME OVER · .* WINS/)).toBeHidden();await expect(guest.getByText(/GAME OVER · .* WINS/)).toBeHidden();
    await expect(host.locator('.chip')).toHaveCount(0);await expect(guest.locator('.chip')).toHaveCount(0);
    await shot(host,testInfo,'13-replay-fresh-round');
    await guest.getByRole('button',{name:'Menu'}).click();await guest.getByRole('button',{name:'Leave game'}).click();
    await expect(guest.getByRole('heading',{name:'Leave this game?'})).toBeVisible();await guest.getByRole('button',{name:'Leave',exact:true}).click();
    await expect(guest.getByRole('heading',{name:'You left the game'})).toBeVisible();
  }finally{await close(hostProfile);await close(guestProfile)}
});

test('approved desktop artboard uses the measured Canvas geometry',async({page})=>{
  await page.setViewportSize({width:1280,height:1040});
  await page.goto('/sequence/');
  await expect(page.locator('.lobby-top')).toHaveCSS('height','88px');
  await expect(page.locator('.lobby-intro')).toHaveCSS('width','1080px');
  await expect(page.locator('.teams')).toHaveCSS('width','1080px');
  await expect(page.locator('.team-panel').first()).toHaveCSS('height','500px');
  await expect(page.locator('.code-badge')).toHaveCSS('width','120px');
  await expect(page.locator('.start')).toHaveCSS('height','68px');
});

test('three-team lobby assigns the remaining color and can create a fresh room',async({page},testInfo)=>{
  await page.setViewportSize({width:1280,height:1040});await page.goto('/sequence/');
  const original=(await page.locator('.code-badge strong').innerText()).trim();
  await page.locator('.team-panel').nth(0).getByLabel('Select blue').click();
  await page.locator('.team-panel').nth(1).getByLabel('Select red').click();
  await page.getByRole('button',{name:'Add third team'}).click();
  await expect(page.locator('.team-panel')).toHaveCount(3);await expect(page.locator('.team-panel').nth(1).locator('.color-control')).toContainText('GREEN');
  await expect(page.locator('.color-control.no-alternative')).toHaveCount(3);
  await page.locator('.team-panel').nth(0).getByRole('button',{name:'Add computer'}).click();
  await page.locator('.team-panel').nth(1).getByRole('button',{name:'Add computer'}).click();await page.locator('.team-panel').nth(1).getByRole('button',{name:'Add computer'}).click();
  await page.locator('.team-panel').nth(2).getByRole('button',{name:'Add computer'}).click();await page.locator('.team-panel').nth(2).getByRole('button',{name:'Add computer'}).click();
  await expect(page.getByRole('button',{name:/Start game/})).toBeEnabled();await shot(page,testInfo,'three-team-ready-lobby');
  await page.getByRole('button',{name:/Start game/}).click();await expect(page.locator('.board-grid')).toBeVisible();await expect(page.locator('.hand-card')).toHaveCount(5);
  const roomId=await page.evaluate(async()=>{const session=await fetch('/sequence/api/session',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}).then(response=>response.json());return session.room.id});
  await page.evaluate(async id=>{await fetch('/sequence/api/test/fixture',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({roomId:id,kind:'win'})})},roomId);
  await expect(page.locator('.sequence-reveal>i')).toHaveCount(5);await expect(page.locator('.result-score-three')).toBeVisible();await expect(page.locator('.sequence-tag')).toContainText('BLUE · ONE SEQUENCE');await shot(page,testInfo,'three-team-winner-overlay');
  await page.getByRole('button',{name:'New game'}).click();
  const confirm=page.getByRole('alertdialog');await expect(confirm.getByRole('heading',{name:'Start a new game?'})).toBeVisible();await confirm.getByRole('button',{name:'New game'}).click();
  await expect(page.getByRole('heading',{name:'Pick your side'})).toBeVisible();await expect(page.locator('.code-badge strong')).not.toHaveText(original);
});

test('credits route renders directly with local-asset attribution',async({page})=>{
  await page.goto('/sequence/credits');
  await expect(page.getByRole('heading',{name:'Made for the table.'})).toBeVisible();
  await expect(page.getByText('Public Domain Deck')).toBeVisible();
  await expect(page.getByText(/Avataaars was created by Pablo Stanley/)).toBeVisible();
  await expect(page.getByRole('link',{name:'Back to game'})).toHaveAttribute('href','/sequence/');
});
