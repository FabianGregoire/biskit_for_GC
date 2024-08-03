import React, { useState, useEffect } from 'react';
import socketIOClient from 'socket.io-client';
import './App.css';
import grosPoulet from './assets/gros poulet.png';
import confetti from "https://esm.run/canvas-confetti@1";

const ENDPOINT = 'http://localhost:5480';

function App() {
    const [socket] = useState(() => socketIOClient(ENDPOINT, {
        transports: ['websocket', 'polling'],
        withCredentials: true
    }));
    const [room, setRoom] = useState('');
    const [isRoomCreated, setIsRoomCreated] = useState(false);
    const [isGameStarted, setIsGameStarted] = useState(false);
    const [diceResult, setDiceResult] = useState([]);
    const [numDice, setNumDice] = useState(2); // Par défaut, lancer 2 dés
    const [isYourTurn, setIsYourTurn] = useState(false);
    const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState('');
    const [currentTurnPlayerName, setCurrentTurnPlayerName] = useState('');
    const [players, setPlayers] = useState([]);
    const [history, setHistory] = useState([]);
    const [openHistoryOverlay, setOpenHistoryOverlay] = useState(false);
    const [openPlayerOverlay, setOpenPlayerOverlay] = useState(false);
    const [penaltyNotification, setPenaltyNotification] = useState('');


    const createRoom = () => {
        const roomName = prompt('Enter room name:');
        const playerName = prompt('Enter your name:');
        if (roomName && playerName) {
            socket.emit('createRoom', { roomName, playerName });
            setRoom(roomName);
        }
    };

    const joinRoom = () => {
        const roomName = prompt('Enter room name:');
        const playerName = prompt('Enter your name:');
        if (roomName && playerName) {
            socket.emit('joinRoom', { roomName, playerName });
            setRoom(roomName);
        }
    };

    const rollDice = () => {
        if (isYourTurn) {
            socket.emit('rollDice', { room, numDice });
            setIsYourTurn(false); // Désactiver le tour après avoir roulé les dés
        }
    };

    const openHistory = () => {
        setOpenHistoryOverlay(!openHistoryOverlay);
    }

    const openPlayers= () => {
        setOpenPlayerOverlay(!openPlayerOverlay);
    }

    useEffect(() => {
        const handleRoomCreated = (room) => {
            setIsRoomCreated(true);
            setIsYourTurn(true);
        };
    
        const handleStartGame = () => {
            setIsRoomCreated(true);
            setIsGameStarted(true);
        };

        const handleDiceResult = (data) => {
            /*setDiceResult({
              dice1: data.resultDice1, dice2: data.resultDice2, total: data.totalresult
            });*/
            if (Array.isArray(data.diceResults)) {
                setDiceResult(data.diceResults);
                //console.log(data.totalResult);
            } else {
                setDiceResult([]);
            }
            setIsYourTurn(false); // Désactiver le tour après avoir roulé les dés
            
        };

        const handleUpdateTurn = (data) => {
            setIsYourTurn(data.playerId === socket.id); // Activer le tour si c'est le joueur local
            setCurrentTurnPlayerId(data.playerId);
            setCurrentTurnPlayerName(data.playerName);
            /*console.log("data.playerId id: " + data.playerId);
            console.log("socket.id: " + socket.id);
            console.log(currentTurnPlayerName);
            console.log("data.playerName: " + data.playerName);*/
        };

        const handleUpdateHistory = (updatedHistory) => {
            setHistory(updatedHistory);
        };
    
        const handlePlayerJoined = (players) => {
            setPlayers(players);
        };
    
        const handleBiskitEvent = (message) => {
            setIsYourTurn(currentTurnPlayerId === socket.id);
        };

        const handleDoubleEvent = (double) => {
            setIsYourTurn(currentTurnPlayerId === socket.id);
            console.log(double);
        }

        const handleChickenPlayerStatus = (playerName) => {
            // Afficher le statut du gros poulet
            const statusElement = document.getElementById('chicken-status');
            if (statusElement) {
                statusElement.textContent = playerName;
            }
        }

        const handleChickenPlayerPenalties = ({ playerId, penalty }) => {
            // Afficher la pénalité sous forme de notification
            setPenaltyNotification(penalty);

            setTimeout(() => {
                setPenaltyNotification('');
            }, 6000); // Supprimer après 5 secondes
        }

        const handleDouble1 = (playerName) => {
            setPenaltyNotification(`Et c'est la pénalité maximale pour ${playerName} !`);
            confetti({
                particleCount: 500,
                spread: 200
            });
            setTimeout(() => {
                setPenaltyNotification('');
            }, 10000);
        }

        socket.on('roomCreated', handleRoomCreated);
        socket.on('startGame', handleStartGame);
        socket.on('diceResult', handleDiceResult);
        socket.on('updateTurn', handleUpdateTurn);
        socket.on('updateHistory', handleUpdateHistory);
        socket.on('playerJoined', handlePlayerJoined);
        socket.on('biskit', handleBiskitEvent);
        socket.on('double', handleDoubleEvent);
        socket.on('chickenPlayerStatus',handleChickenPlayerStatus);
        socket.on('chickenPlayerPenalties',handleChickenPlayerPenalties);
        socket.on('double_1', handleDouble1);
        /*socket.on('numberCheck', handleCheckNumberEvent);*/

        // Clean up the event listeners on unmount
        return () => {
            socket.off('roomCreated', handleRoomCreated);
            socket.off('startGame', handleStartGame);
            socket.off('diceResult', handleDiceResult);
            socket.off('updateTurn', handleUpdateTurn);
            socket.off('updateHistory', handleUpdateHistory);
            socket.off('playerJoined', handlePlayerJoined);
            socket.off('biskit', handleBiskitEvent);
            socket.off('double', handleDoubleEvent);
            socket.off('chickenPlayerStatus',handleChickenPlayerStatus);
            socket.off('chickenPlayerPenalties',handleChickenPlayerPenalties);
            /*socket.off('numberCheck', handleCheckNumberEvent);*/
        };

    }, [socket]);

    return (
        <div className="App">
            {!isRoomCreated && (
                <div style={{textAlign: 'center'}}>
                    <a href="#" className="room-buttons" onClick={createRoom}>
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                        Create Room
                    </a>
                    <a href="#" className="room-buttons" onClick={joinRoom}>
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                        Join Room
                    </a>
                </div>
            )}
            {isRoomCreated && !isGameStarted && (
                <div>
                    Waiting for another player to join...
                </div>
            )}
            {isGameStarted && (
                <div>
                    <div id="history-button" onClick={openHistory} className={openHistoryOverlay ? 'invert' : ''}>H</div>
                    <div id="history" className={openHistoryOverlay ? 'reveal' : 'hide'}>
                        <h3>Historique des lancers :</h3>
                        <div id="diceResult">
                            {/*diceResult ? `You rolled ${diceResult.join(', ')} for a total of ${diceResult.reduce((sum, value) => sum + value, 0)}` : 'Click to roll the dice!'*/
                            history.map((record, index) => (
                                <div key={index}>
                                    <p>{record.playerName}: </p>
                                    <p>{record.diceResults.join(' / ')}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div id="players-button" onClick={openPlayers} className={openPlayerOverlay ? 'invert' : ''}>J</div>
                    <div id="players-list" className={openPlayerOverlay ? 'reveal' : 'hide'}>
                        <div id="players">
                            {players.map((player, index) => (
                                <div key={index} className={player.id === socket.id ? 'active' : ''}>
                                    {player.name}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div id="chicken">
                        <img src={grosPoulet} alt="Gros Poulet"></img>
                        <p id="chicken-status">Vacant</p>
                    </div>
                    <div className="current-player">Tour en cours: <br></br>{currentTurnPlayerName}</div>
                    <div id="dice-container">
                        {Array.isArray(diceResult) && diceResult.map((result, index) => (
                            <div key={index} className={`dice dice${index + 1}`} data-side={result}>
                                {[1, 2, 3, 4, 5, 6].map(side => (
                                    <div key={side} className={`sides side-${side} ${side === result ? 'active' : ''}`}>
                                        {[...Array(side)].map((_, dotIndex) => (
                                            <span key={dotIndex} className={`dot dot-${dotIndex + 1}`}></span>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                    <button id="rollDice" onClick={rollDice} disabled={!isYourTurn}>JOUER</button>
                    <div style={{display: 'none'}}>
                        <label htmlFor="numDice">Number of Dices:</label>
                        <input
                            type="number"
                            id="numDice"
                            value={numDice}
                            onChange={(e) => setNumDice(Number(e.target.value))}
                            min="1"
                            max="2" 
                            disabled={!isYourTurn}
                        />
                    </div>
                    <div id="penaltyNotification" className= {penaltyNotification ? 'reveal' : 'hide'}>{penaltyNotification}</div>
                </div>
            )}
        </div>
    );
}

export default App;