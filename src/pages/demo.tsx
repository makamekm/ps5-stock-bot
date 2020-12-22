import { observer } from "mobx-react";
import React, { useContext } from "react";
import { SecondService } from "~/components/services/SecondService";

const Page: React.FC = observer(() => {
  const service = useContext(SecondService);
  return (
    <div>
      <button onClick={service.increaseCounter}>Click Me</button>
      <div>Counter: {service.counterValue}</div>
    </div>
  );
});

export default Page;
