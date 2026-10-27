import { useState } from 'react';
import {
  ANYWHERE,
  GENDER_OPTIONS,
  GROUP_ROOMS,
  MAX_NICKNAME_LENGTH,
  MAX_TOPICS,
  PH_LOCATIONS,
  PRIVATE_CODE_LENGTH,
} from '../../config/constants';
import { slugify } from '../../utils/format';
import Field from './Field';
import ModeTabs from './ModeTabs';
import TopicsInput from './TopicsInput';

const COPY = {
  'one-on-one': {
    title: 'Who do you want to talk to?',
    intro: 'Everything below is optional. Skip it and you’ll be paired with anyone.',
  },
  group: {
    title: 'Pick a room',
    intro: 'Public rooms are open to anyone. Join one and say hi.',
  },
  private: {
    title: 'Chat in private',
    intro: 'Make a room code and share it, or enter a code a friend sent you.',
  },
};

function uniqueRooms(names) {
  const seen = new Set();
  return names.filter((name) => {
    const slug = slugify(name);
    if (!slug || seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });
}

function RandomOptions({ setup, onChange }) {
  return (
    <>
      <Field label="Gender" htmlFor="chat-gender">
        <div className="segmented" id="chat-gender">
          {GENDER_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={setup.gender === option}
              className={setup.gender === option ? 'selected' : ''}
              onClick={() => onChange({ gender: setup.gender === option ? '' : option })}
            >
              {option}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Location" htmlFor="chat-location">
        <select
          id="chat-location"
          value={setup.location}
          onChange={(e) => onChange({ location: e.target.value })}
        >
          <option>{ANYWHERE}</option>
          {PH_LOCATIONS.map((city) => (
            <option key={city}>{city}</option>
          ))}
        </select>
      </Field>

      <Field
        label="Topics"
        htmlFor="chat-topics"
        hint={`${setup.topics.length}/${MAX_TOPICS} added`}
      >
        <TopicsInput topics={setup.topics} onChange={(topics) => onChange({ topics })} />
      </Field>
    </>
  );
}

function GroupOptions({ setup, ready, customRoom, onCustomRoom, onJoin }) {
  const rooms = uniqueRooms([...GROUP_ROOMS, ...setup.topics]);
  return (
    <>
      <div className="room-picker">
        {rooms.map((name) => (
          <button key={name} type="button" disabled={!ready} onClick={() => onJoin(name)}>
            {name}
          </button>
        ))}
      </div>
      <Field
        label="Or start your own room"
        htmlFor="custom-room"
        hint="Anyone who types the same name joins it"
      >
        <input
          id="custom-room"
          value={customRoom}
          onChange={(e) => onCustomRoom(e.target.value)}
          maxLength={30}
          placeholder="e.g. Esmeringer"
        />
      </Field>
      <button
        className="primary-button setup-submit"
        disabled={!ready || !customRoom.trim()}
      >
        Join room
      </button>
    </>
  );
}

function PrivateOptions({ ready, code, onCode, onCreate }) {
  return (
    <>
      <button
        type="button"
        className="primary-button setup-submit"
        disabled={!ready}
        onClick={onCreate}
      >
        Create a private room
      </button>
      <div className="or-row">or join one</div>
      <div className="join-row">
        <input
          value={code}
          onChange={(e) => onCode(e.target.value.toUpperCase())}
          maxLength={PRIVATE_CODE_LENGTH}
          placeholder="ENTER CODE"
          aria-label="Room code"
        />
        <button
          className="secondary-button"
          disabled={!ready || code.trim().length < PRIVATE_CODE_LENGTH}
        >
          Join
        </button>
      </div>
    </>
  );
}

export default function SetupCard({
  mode,
  onMode,
  setup,
  nicknameDraft,
  onNickname,
  onChange,
  error,
  busy,
  actions,
}) {
  const [customRoom, setCustomRoom] = useState('');
  const [code, setCode] = useState('');
  const ready = setup.adult && !busy;
  const { title, intro } = COPY[mode];

  function submit(event) {
    event.preventDefault();
    if (!ready) return;
    if (mode === 'one-on-one') actions.startRandom();
    else if (mode === 'group' && customRoom.trim()) actions.joinGroup(customRoom);
    else if (mode === 'private' && code.trim().length === PRIVATE_CODE_LENGTH)
      actions.joinPrivate(code);
  }

  return (
    <form className="setup-card" onSubmit={submit}>
      <div>
        <h2>{title}</h2>
        <p className="setup-intro">{intro}</p>
      </div>

      <ModeTabs mode={mode} onChange={onMode} />

      <Field label="Temporary nickname" htmlFor="chat-nickname">
        <input
          id="chat-nickname"
          value={nicknameDraft}
          maxLength={MAX_NICKNAME_LENGTH}
          onChange={(e) => onNickname(e.target.value)}
          placeholder="e.g. Kenneth, Al, Joe, Ado, Paul etc."
        />
        <p className="setup-hint">Don’t use your real name or any contact details.</p>
      </Field>

      {mode === 'one-on-one' && <RandomOptions setup={setup} onChange={onChange} />}
      {mode === 'group' && (
        <GroupOptions
          setup={setup}
          ready={ready}
          customRoom={customRoom}
          onCustomRoom={setCustomRoom}
          onJoin={actions.joinGroup}
        />
      )}
      {mode === 'private' && (
        <PrivateOptions
          ready={ready}
          code={code}
          onCode={setCode}
          onCreate={actions.createPrivate}
        />
      )}

      <label className="setup-consent">
        <input
          type="checkbox"
          checked={setup.adult}
          onChange={(e) => onChange({ adult: e.target.checked })}
        />
        <span>I’m 18 or older, and I’ll keep things respectful.</span>
      </label>

      {mode === 'one-on-one' && (
        <button className="primary-button setup-submit" disabled={!ready}>
          Start random chat
        </button>
      )}

      {error && <div className="setup-error">{error}</div>}
      <p className="setup-hint setup-note">
        You can leave, report or block anyone at any time.
      </p>
    </form>
  );
}
