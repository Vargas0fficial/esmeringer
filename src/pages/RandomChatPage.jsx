import { useState } from 'react';
import { Flag, HeartHandshake, ShieldCheck } from 'lucide-react';
import ConfigNotice from '../components/random/ConfigNotice';
import DirectChat from '../components/random/DirectChat';
import GroupRoom from '../components/random/GroupRoom';
import PrivateWaiting from '../components/random/PrivateWaiting';
import SearchingView from '../components/random/SearchingView';
import SetupCard from '../components/random/SetupCard';
import SectionHeading from '../components/SectionHeading';
import { ANYWHERE } from '../config/constants';
import { useChatSetup } from '../hooks/useChatSetup';
import { useGroupChat } from '../hooks/useGroupChat';
import { useMatchmaking } from '../hooks/useMatchmaking';
import { usePrivateRoom } from '../hooks/usePrivateRoom';
import { firebaseConfigured } from '../lib/firebase';

const GUIDELINES = [
  { icon: ShieldCheck, title: 'Stay safe', text: 'Keep personal details private.' },
  { icon: HeartHandshake, title: 'Be respectful', text: 'Everyone deserves kindness.' },
  { icon: Flag, title: 'Speak up', text: 'Report behavior that feels wrong.' },
];

export default function RandomChatPage() {
  const { setup, nicknameDraft, setNickname, update } = useChatSetup();
  const [mode, setMode] = useState('one-on-one');
  const random = useMatchmaking();
  const priv = usePrivateRoom();
  const group = useGroupChat();

  const randomProfile = {
    nickname: setup.nickname,
    gender: setup.gender,
    location: setup.location,
    topics: setup.topics,
  };
  // Private rooms and group chats only share a nickname.
  const plainProfile = {
    nickname: setup.nickname,
    gender: '',
    location: ANYWHERE,
    topics: [],
  };

  const actions = {
    startRandom: () => random.start(randomProfile),
    createPrivate: () => priv.create(plainProfile),
    joinPrivate: (code) => priv.join(code, plainProfile),
    joinGroup: (name) => group.join(name, setup.nickname || 'Stranger'),
  };

  const errors = { 'one-on-one': random.error, group: group.error, private: priv.error };
  const busy = priv.busy || group.busy;

  let view;
  let inChat = true;
  if (!firebaseConfigured) {
    view = <ConfigNotice />;
  } else if (random.phase === 'searching') {
    view = <SearchingView onCancel={random.cancel} />;
  } else if (random.phase === 'chatting') {
    view = (
      <DirectChat
        key={random.chatId}
        chatId={random.chatId}
        uid={random.uid}
        onExit={random.reset}
        onNext={() => random.start(randomProfile)}
      />
    );
  } else if (priv.phase === 'hosting') {
    view = <PrivateWaiting code={priv.code} onCancel={priv.cancel} />;
  } else if (priv.phase === 'chatting') {
    view = (
      <DirectChat
        key={priv.chatId}
        chatId={priv.chatId}
        uid={priv.uid}
        onExit={priv.reset}
      />
    );
  } else if (group.room) {
    view = <GroupRoom group={group} />;
  } else {
    inChat = false;
    view = (
      <SetupCard
        mode={mode}
        onMode={setMode}
        setup={setup}
        nicknameDraft={nicknameDraft}
        onNickname={setNickname}
        onChange={update}
        error={errors[mode]}
        busy={busy}
        actions={actions}
      />
    );
  }

  return (
    <>
      <SectionHeading
        logo
        eyebrow="A LITTLE MYSTERY"
        title="Esmeringer"
        subtitle="One person, one conversation, a brand-new possibility."
      />

      <div className={`random-stage ${inChat ? 'in-chat' : 'in-setup'}`}>{view}</div>

      <div className="random-guidelines">
        {GUIDELINES.map(({ icon: Icon, title, text }) => (
          <div key={title}>
            <Icon />
            <span>
              <strong>{title}</strong>
              <small>{text}</small>
            </span>
          </div>
        ))}
      </div>

      <p className="name-origin">
       FYI. Esmeringer comes from the famous word “Esmeringhoy”, which means “Bembang”
        HAHAHA
      </p>
    </>
  );
}