import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const API = import.meta.env.VITE_API_URL || '';

function CardTile({card, onSelect}) {
  const cls = card.status === 'available' ? 'tile-available' : (card.status === 'reserved' ? 'tile-reserved' : 'tile-sold');
  return (
    <div className={`card-tile ${cls} cursor-pointer`} onClick={()=> onSelect(card)}>
      <div>
        <div className="text-sm">#{card._id}</div>
        <div className="text-xs opacity-75">{card.status}</div>
      </div>
    </div>
  );
}

function CardView({card, drawnNumbers}) {
  if (!card) return null;
  const numbers = card.numbers || [];
  return (
    <div className="grid grid-cols-5 gap-1 p-2 bg-white/60 rounded">
      {numbers.flat().map((n, idx) => {
        const isFree = n === 0;
        const drawn = (drawnNumbers || []).includes(n);
        const cls = `cell ${isFree ? 'free' : ''} ${drawn ? 'drawn' : ''}`;
        return <div key={idx} className={cls}>{isFree ? 'FREE' : n}</div>;
      })}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [activeGame, setActiveGame] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    # Telegram WebApp init
    tg = typeof window !== 'undefined' and window.Telegram ? window.Telegram.WebApp : null;
    if (tg) {
      axios.defaults.headers.common['X-Telegram-InitData'] = tg.initData || '';
      const tguser = tg.initDataUnsafe?.user;
      if (tguser && tguser.id) {
        (async () => {
          try {
            const res = await axios.post(`${API || '/'}api/user`, { telegramId: String(tguser.id), username: tguser.username || tguser.first_name });
            setUser(res.data);
            // join room after socket connects
          } catch (e) {
            console.warn('user upsert failed', e.message);
          }
        })();
      }
      try { tg.ready(); } catch(e){}
    } else {
      const saved = localStorage.getItem('habesha:user');
      if (saved) setUser(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    // fetch cards (first page)
    (async () => {
      try {
        const res = await axios.get(`${API || '/'}api/cards?limit=60&page=1`);
        setCards(res.data);
      } catch (e) {
        console.warn('fetch cards failed', e.message);
        // create dummy cards for UI demo when backend not connected
        const dummy = Array.from({length:60}, (_,i)=>({
          _id: i+1,
          status: 'available',
          numbers: generateDummyCard(i+1)
        }));
        setCards(dummy);
      }
    })();
    // setup socket
    socketRef.current = io(API || '/', { transports: ['websocket'] });
    socketRef.current.on('connect', () => {
      console.log('socket connected', socketRef.current.id);
      if (user?.telegramId) socketRef.current.emit('join', { telegramId: user.telegramId });
    });
    socketRef.current.on('bingo:draw', (payload) => {
      setActiveGame(g => ({...g, numbersDrawn: [...(g?.numbersDrawn||[]), payload.number]}));
    });
    socketRef.current.on('game:start', ({game}) => {
      setActiveGame(game);
    });
    socketRef.current.on('game:end', (payload) => {
      setActiveGame(prev => ({...prev, status: 'finished'}));
    });
    socketRef.current.on('card:reserved', ({cardId, status}) => {
      setCards(prev => prev.map(c => c._id === cardId ? {...c, status} : c));
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [user]);

  function generateDummyCard(seed) {
    // simple deterministic placeholder: generate 5x5 numbers from seed
    const arr = [];
    for (let r=0;r<5;r++){
      const row = [];
      for (let c=0;c<5;c++){
        const n = ((seed + r*5 + c) % 75) + 1;
        row.push(n);
      }
      arr.push(row);
    }
    arr[2][2] = 0;
    return arr;
  }

  async function reserveCard(card) {
    if (!user) return alert('Sign in via Telegram WebApp first.');
    try {
      const res = await axios.post(`${API || '/'}api/cards/${card._id}/reserve`);
      if (res.data && res.data.card) {
        setSelectedCard(res.data.card);
        setCards(prev => prev.map(c => c._id===card._id ? res.data.card : c));
      } else {
        alert(res.data.message || 'Reserve failed');
      }
    } catch (e) {
      alert('Reserve failed: ' + (e.response?.data?.error || e.message));
    }
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-5xl mx-auto">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Habesha Bingo — WebApp</h1>
          <div>{user ? <span className="text-sm">Signed: {user.username || user.telegramId}</span> : <span className="text-sm">Open in Telegram to sign</span>}</div>
        </header>

        {!activeGame || activeGame.status === 'waiting' ? (
          <div className="grid md:grid-cols-4 gap-4">
            <div className="md:col-span-3">
              <h2 className="mb-2 font-semibold">Choose your board (1–400)</h2>
              <div className="grid grid-cols-6 gap-2">
                {cards.map(c => (
                  <CardTile key={c._id} card={c} onSelect={(card)=>{
                    if (card.status === 'available') reserveCard(card);
                    else if (card.ownerUserId && user && card.ownerUserId === user._id) setSelectedCard(card);
                    else alert('Card not available');
                  }} />
                ))}
              </div>
            </div>

            <aside className="bg-white p-3 rounded shadow">
              <h3 className="font-semibold">Selected</h3>
              {selectedCard ? (
                <>
                  <div className="text-sm mb-2">Board number {selectedCard._id}</div>
                  <CardView card={selectedCard} drawnNumbers={activeGame?.numbersDrawn || []} />
                  <div className="mt-3">
                    <button className="bingo-btn" onClick={()=>alert('Implement buy flow')}>Buy / Confirm</button>
                  </div>
                </>
              ) : <div className="text-sm">No board selected</div>}
            </aside>
          </div>
        ) : (
          <div className="game-view grid md:grid-cols-3 gap-4">
            <div className="col-span-1 bg-white p-3 rounded shadow overflow-auto" style={{maxHeight: '70vh'}}>
              <h3 className="font-semibold mb-2">All numbers</h3>
              <div className="grid grid-cols-1 gap-1">
                {Array.from({length:75}, (_,i)=>i+1).map(n => (
                  <div key={n} className={`p-2 rounded ${activeGame.numbersDrawn && activeGame.numbersDrawn.includes(n) ? 'bg-orange-400 text-white' : 'bg-gray-100'}`}>{n}</div>
                ))}
              </div>
            </div>

            <div className="col-span-1 bg-white p-3 rounded shadow">
              <h3 className="font-semibold">Current Call</h3>
              <div className="text-4xl font-bold my-4 text-center">{activeGame.numbersDrawn && activeGame.numbersDrawn.slice(-1)[0]}</div>
              <div className="mb-4">Last calls: {(activeGame.numbersDrawn || []).slice(-3).reverse().join(', ')}</div>
              <div>
                {selectedCard ? <CardView card={selectedCard} drawnNumbers={activeGame.numbersDrawn || []} /> : <div>Select your board</div>}
              </div>
              <div className="mt-4 text-center">
                <button className="bingo-btn" onClick={()=>{
                  if (!selectedCard) return alert('Select a board first');
                  socketRef.current.emit('claimBingo', { cardId: selectedCard._id });
                  alert('Claim submitted!');
                }}>BINGO!</button>
              </div>
            </div>

            <div className="col-span-1 bg-white p-3 rounded shadow">
              <h3 className="font-semibold">Players & Info</h3>
              <div className="mt-2 text-sm">Players: {activeGame.playersCount || '—'}</div>
              <div className="mt-4">
                <button className="px-3 py-2 border rounded" onClick={()=>{
                  // allow leaving
                  setSelectedCard(null);
                }}>Leave board</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
