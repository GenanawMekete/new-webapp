import React, { useEffect, useState } from 'react';
import Countdown from './components/Countdown';
import CardPicker from './components/CardPicker';
import Board from './components/Board';
import { getTelegramUser } from './telegram';

const API = 'http://localhost:4000';

export default function App() {
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [seconds, setSeconds] = useState(30);
  const [user, setUser] = useState(null);

  // Load Telegram user
  useEffect(() => {
    const tgData = getTelegramUser();
    setUser(tgData.user);

    // OPTIONAL: send user to backend
    fetch(`${API}/api/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: tgData.user,
        initData: tgData.initData
      })
    }).catch(() => {});
  }, []);

  // Fetch bingo cards
  useEffect(() => {
    fetch(`${API}/api/cards`)
      .then(res => res.json())
      .then(data => setCards(data.cards || []))
      .catch(() => {});
  }, []);

  // Countdown
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  return (
    <div className="app">
      <div className="header">
        <Countdown value={seconds} />
        <div>
          <h2>Bingo</h2>
          <p className="subtitle">
            👤 {user?.username || user?.first_name || 'Guest'}
          </p>
        </div>
      </div>

      {seconds > 0 ? (
        <CardPicker
          cards={cards}
          selected={selectedCard}
          onSelect={setSelectedCard}
        />
      ) : (
        <Board card={selectedCard} />
      )}
    </div>
  );
}
