import React from "react";
import renderer from "react-test-renderer";
import { Title } from "./Title";

describe("Title Component", () => {
  it("should match snapshot", () => {
    const component = renderer.create(<Title />);
    let tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });
});
