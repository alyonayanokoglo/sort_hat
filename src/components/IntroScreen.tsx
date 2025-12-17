import './IntroScreen.css';

interface IntroScreenProps {
  onStart: () => void;
}

export default function IntroScreen({ onStart }: IntroScreenProps) {
  return (
    <div className="intro-screen">
      <div className="intro-card">
        <div className="card-content">
          <img
            className="intro-cta-image"
            src="/cat_cta.png"
            alt="Волшебный кот"
          />

          <h2 className="intro-heading">
            Дорогой волшебник, этот час настал!
          </h2>

          <div className="intro-text">
            <p>
              Знаменитая Распределяющая Шляпа готова объявить, какой именно факультет Хогвартса
              станет твоим домом.
            </p>
            <p>
              Кто же ты — отважный гриффиндорец, доблестный пуффендуец, проницательный когтевранец,
              упорный слизеринец или новатор-промтевринец?
            </p>
            <p>
              Выбирай один вариант ответа, который наиболее точно отражает твои предпочтения и качества.
            </p>
          </div>

          <button className="start-button" onClick={onStart}>
            Начать распределение
          </button>
        </div>
      </div>
    </div>
  );
}
