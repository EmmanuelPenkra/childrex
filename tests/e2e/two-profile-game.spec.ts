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

    await host.locator('.team-panel').nth(0).getByLabel('Select blue').click();
    await host.locator('.team-panel').nth(1).getByLabel('Select red').click();
    await host.locator('.avatar-button').click();
    await expect(host.getByRole('heading',{name:'Choose your avatar'})).toBeVisible();
    await host.getByLabel('Avatar 6').click();
    await host.locator('.player-name').dblclick();
    await host.getByLabel('Player name').fill('Amara');await host.getByLabel('Player name').press('Enter');
    await expect(host.locator('.player').first()).toHaveAttribute('title',/Amara/);

    await guest.goto(`/sequence/join?code=${code}`);
    await expect(guest.getByRole('heading',{name:'Enter the game code'})).toBeVisible();
    await expect(guest.getByRole('textbox',{name:'Game code'})).toHaveValue(code);
    await expect(guest.getByRole('button',{name:/Join game/})).toBeEnabled();
    await guest.getByRole('button',{name:/Join game/}).click();
    await expect(guest.getByRole('heading',{name:'Pick your side'})).toBeVisible();
    await expect(host.locator('.player')).toHaveCount(2);
    await expect(guest.locator('.player')).toHaveCount(2);
    await shot(host,testInfo,'02-host-balanced-lobby');await shot(guest,testInfo,'03-guest-balanced-lobby');

    await expect(host.getByRole('button',{name:/Start game/})).toBeEnabled();
    await host.getByRole('button',{name:/Start game/}).click();
    await expect(host.locator('.board-grid')).toBeVisible();await expect(guest.locator('.board-grid')).toBeVisible();
    await expect(host.locator('.board-cell')).toHaveCount(100);await expect(host.locator('.hand-card')).toHaveCount(7);
    await shot(host,testInfo,'04-host-game-rest');await shot(guest,testInfo,'05-guest-game-rest');

    const hostIsCurrent=(await host.locator('.player.current .player-name').innerText())==='You';
    const mover=hostIsCurrent?host:guest;const observer=hostIsCurrent?guest:host;
    await choosePlayable(mover);
    await expect(mover.locator('.hand-card.selected')).toHaveCount(1);
    await expect(mover.locator('.board-cell.valid').first()).toBeVisible();
    await shot(mover,testInfo,'06-selected-valid-moves');
    await mover.locator('.board-cell.valid').first().click();
    await expect(mover.locator('.board-cell.last')).toHaveCount(1);await expect(observer.locator('.board-cell.last')).toHaveCount(1);
    await expect(mover.locator('.hand-card.selected')).toHaveCount(0);
    await shot(mover,testInfo,'07-move-committed');await shot(observer,testInfo,'08-move-synchronized');

    await host.getByRole('button',{name:'Menu'}).click();await expect(host.getByRole('dialog',{name:'Game menu'})).toBeVisible();
    await host.getByRole('button',{name:/Sound/}).click();await expect(host.getByRole('button',{name:/Sound/}).locator('.switch')).toHaveClass(/on/);
    await shot(host,testInfo,'09-menu-overlay');await host.locator('.menu-scrim').click({position:{x:100,y:500}});await expect(host.getByRole('dialog',{name:'Game menu'})).toBeHidden();

    const roomId=await host.evaluate(async()=>{const session=await fetch('/sequence/api/session',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}).then(r=>r.json());return session.room.id});
    await host.evaluate(async id=>{await fetch('/sequence/api/test/fixture',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({roomId:id,kind:'sequence'})})},roomId);
    await expect(host.locator('.board-cell.sequence-cell')).toHaveCount(5);await expect(guest.locator('.board-cell.sequence-cell')).toHaveCount(5);
    await expect(host.locator('.player.current')).toHaveCount(1);
    await shot(host,testInfo,'10-completed-sequence-next-turn');

    await host.evaluate(async id=>{await fetch('/sequence/api/test/fixture',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({roomId:id,kind:'win'})})},roomId);
    await expect(host.getByText(/GAME OVER · .* WINS/)).toBeVisible();await expect(guest.getByText(/GAME OVER · .* WINS/)).toBeVisible();
    await shot(host,testInfo,'11-winner-overlay');await shot(guest,testInfo,'12-result-other-profile');
    await guest.getByRole('button',{name:/Replay/}).click();
    await expect(host.getByText(/GAME OVER · .* WINS/)).toBeHidden();await expect(guest.getByText(/GAME OVER · .* WINS/)).toBeHidden();
    await expect(host.locator('.chip')).toHaveCount(0);await expect(guest.locator('.chip')).toHaveCount(0);
    await shot(host,testInfo,'13-replay-fresh-round');
  }finally{await close(hostProfile);await close(guestProfile)}
});

test('phone layout starts a game with a computer without horizontal page overflow',async({browser},testInfo)=>{
  const profile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:testInfo.outputPath('phone-video'),size:{width:390,height:844}}});const page=await profile.newPage();
  try{await page.goto('/sequence/');await expect(page.getByRole('heading',{name:'Pick your side'})).toBeVisible();await page.locator('.team-panel').nth(0).getByLabel('Select blue').click();await page.locator('.team-panel').nth(1).getByLabel('Select red').click();await page.locator('.team-panel').nth(1).getByRole('button',{name:'+ Add computer'}).click();await expect(page.getByRole('button',{name:/Start game/})).toBeEnabled();await shot(page,testInfo,'phone-lobby');await page.getByRole('button',{name:/Start game/}).click();await expect(page.locator('.board-cell')).toHaveCount(100);await expect(page.locator('.hand-card')).toHaveCount(7);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);await shot(page,testInfo,'phone-game');await choosePlayable(page);await expect(page.locator('.board-cell.valid').first()).toBeVisible();await page.locator('.board-cell.valid').first().click();await expect(page.locator('.board-cell.last')).toHaveCount(1)}finally{await close(profile)}});

test('credits route renders directly with local-asset attribution',async({page})=>{
  await page.goto('/sequence/credits');
  await expect(page.getByRole('heading',{name:'Made for the table.'})).toBeVisible();
  await expect(page.getByText('Public Domain Deck')).toBeVisible();
  await expect(page.getByText(/Avataaars was created by Pablo Stanley/)).toBeVisible();
  await expect(page.getByRole('link',{name:'Back to game'})).toHaveAttribute('href','/sequence/');
});
