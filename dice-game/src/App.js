import React, { useState, useEffect } from 'react';
import socketIOClient from 'socket.io-client';
import './App.css';
import grosPoulet from './assets/gros poulet.png';
import confetti from "https://esm.run/canvas-confetti@1";
import 'animate.css/animate.min.css';

const ENDPOINT = 'wss://biskit.fabiangregoire.fr'; //http://localhost:5040 | wss://biskit.fabiangregoire.fr

function App() {
    const [socket] = useState(() => socketIOClient(ENDPOINT, {
        transports: ['websocket'],
        withCredentials: true,
        secure: true,
        reconnectionAttempts: 5,
        timeout: 20000
    }));

    let nextPenaltyId = 1;
    const defaultRules= [
        "BISKIT: Si la somme des dés fait 7, tous les joueurs doivent dire 'BISKIT' en levant la main devant le front. Le dernier prend une pénalité !",
        "GROS POULET: Le premier joueur de la partie qui fait un 3, devient le gros poulet. Pour le perdre, il devra de nouveau faire un 3. Pendant tout le temps où il est resté le gros poulet, chaque joueur qui fera un 3 donnera une pénalité au gros poulet ! (Attention, si le gros poulet fait un double 3, il le perd puis le regagne :)",
        "DOUBLE: Si un double est lancé, le joueur peut donner le nombre de pénalité correspondant au double en question. Attention, si c'est un double 6, il peut également ajouter une règle !",
        "DOUBLE 1: Attention, si c'est un double 1, le joueur prend la pénalité maximale ! Aucune échapatoire possible :)",
        "SOMME: Si la somme des dés fait 9, le joueur précédent prend une pénalité. Si c'est 10 c'est le joueur en cours, et si c'est 11 c'est le joueur d'après.",
        "DUEL: Si la somme des dés fait 3, le joueur doit choisir un adversaire pour un duel. Le premier lancé sert à determiner le montant de la pénalité en jeu (le dé leplus haut définit cela). Le deuxième lancer sert à départager le gagnant et la perdant. Attention toutefois, si il y a un double, les joueurs doivent relancer jusqu'à se départager, et la somme des pénalités DOUBLE à chaque fois !"
    ]
    const [room, setRoom] = useState('');
    const [isRoomCreated, setIsRoomCreated] = useState(false);
    const [isGameStarted, setIsGameStarted] = useState(false);
    const [diceResult, setDiceResult] = useState([]);
    const [numDice, setNumDice] = useState(2); // Par défaut, lancer 2 dés
    const [isAnimating, setIsAnimating] = useState(false);
    const [isYourTurn, setIsYourTurn] = useState(false);
    const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState('');
    const [currentTurnPlayerName, setCurrentTurnPlayerName] = useState('');
    const [players, setPlayers] = useState([]);
    const [openPlayerOverlay, setOpenPlayerOverlay] = useState(false);
    const [history, setHistory] = useState([]);
    const [openHistoryOverlay, setOpenHistoryOverlay] = useState(false);
    const [rules, setRules] = useState(defaultRules);
    const [openRulesOverlay, setOpenRulesOverlay] = useState(false);
    const [penaltyNotification, setPenaltyNotification] = useState([]);

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

    const openPlayers = () => {
        setOpenPlayerOverlay(!openPlayerOverlay);
    }

    const openRules = () => {
        setOpenRulesOverlay(!openRulesOverlay);
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

            // Activer l'animation en réinitialisant d'abord les résultats à [0, 0]
            setIsAnimating(true);

            if (Array.isArray(data.diceResults)) {
                
                // Mettre à jour les résultats des dés après une courte pause
                setDiceResult(data.diceResults);
                
                // Arrêter l'animation après la durée de l'animation
                setTimeout(() => {
                    setIsAnimating(false);
                }, 1500); // La durée de l'animation CSS en millisecondes

            } else {
                setDiceResult([]); // Réinitialiser les résultats si aucune donnée valide n'est reçue
                setIsAnimating(false); // Arrêter l'animation si aucun résultat n'est reçu
            }
            setIsYourTurn(false); // Désactiver le tour après avoir roulé les dés
        };

        const handleUpdateTurn = (data) => {
            setTimeout(() => {
                setIsYourTurn(data.playerId === socket.id); // Activer le tour si c'est le joueur local
            }, 3000);
            setCurrentTurnPlayerId(data.playerId);
            setCurrentTurnPlayerName(data.playerName);
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

        const handleChickenPlayerStatus = (playerName) => {
            const statusElement = document.getElementById('chicken-status');
            statusElement.className = "";
            // Afficher le statut du gros poulet
            setTimeout(() => {
                if (statusElement) {
                    statusElement.className = "animate__animated animate__slideInRight";
                    statusElement.textContent = playerName;
                }
            }, 3000);
        }

        const handleChickenPlayerPenalties = ({playerId, penalty}) => {
            const currentPenaltyId = nextPenaltyId; // Stocker l'ID actuel dans une variable locale
            nextPenaltyId++; // Incrémenter l'ID pour la prochaine notification
        
            setTimeout(() => {
                // Ajouter la pénalité au tableau de notifications
                setPenaltyNotification(prevNotifications => {
                    const newNotification = { id: currentPenaltyId, message: penalty , state : true};
                    return [...prevNotifications, newNotification];
                });
            }, 1500);
        
            setTimeout(() => {
                // Mettre à jour l'état de la notification
                setPenaltyNotification(prevNotifications => 
                    prevNotifications.map(notification =>
                        notification.id === currentPenaltyId
                            ? { ...notification, state: false } // Créer une nouvelle copie de l'objet avec l'état mis à jour
                            : notification
                    )
                );
            }, 5700);

            // Supprimer la notification après 6 secondes
            setTimeout(() => {
                setPenaltyNotification(prevNotifications =>
                    prevNotifications.filter(notification => notification.id !== currentPenaltyId)
                );
            }, 6000);
        };

        const handleDoubleEvent = ({playerName, doubleNumber}) => {
            if (doubleNumber === 1 || doubleNumber === 6){
                confetti({
                    particleCount: 500,
                    spread: 200
                });
                if (doubleNumber === 1){
                    handleChickenPlayerPenalties({playerId: 99, penalty: `Et c'est la pénalité maximale pour ${playerName} !`});
                }else{
                    handleChickenPlayerPenalties({playerId: 99, penalty: `${playerName} distribue 6 pénalités et peut ajouter une règle de son choix !`});
                    setTimeout(() => {
                        const newRule = prompt('Enter new rule:');
                        setRules(prevRules => {
                            return [...prevRules, newRule];
                        });
                    }, 2000);
                }
            }else{
                handleChickenPlayerPenalties({playerId: 99, penalty: `${playerName} distribue ${doubleNumber} pénalités !`});
            }
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
                    <div id="rules-button" onClick={openRules} className={openRulesOverlay ? 'invert' : ''}>Règles</div>
                    <div id="rules-list" className={openRulesOverlay ? 'reveal' : 'hide'}>
                        <div id="rules">
                            {rules.map((rule, index) => (
                                <div key={index}>
                                    {rule}
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
                            <div key={index} className={`dice dice${index + 1} ${isAnimating ? 'animate' : ''}`} data-side={result}>
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
                    <button id="rollDice" onClick={rollDice} disabled={!isYourTurn} className={isYourTurn?'active':''}>JOUER</button>
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
                    <div id="penaltyNotification" className= {penaltyNotification.length > 0 ? 'reveal' : 'hide'}>
                        {penaltyNotification.map((notification) => (
                            <div key={notification.id} id="singleNotification" className={notification.state ? 'active' : 'inactive'}>
                                {notification.message}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;