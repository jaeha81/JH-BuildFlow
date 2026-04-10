import { describe, it, expect } from "vitest";

import { RemoteHarnessConnector } from "../connector/remote-harness-connector";

describe("RemoteHarnessConnector — stub 동작 검증", () => {
  const connector = new RemoteHarnessConnector(
    "http://remote-server:8080",
    "test-api-key"
  );

  it("executeWave는 NotImplementedError를 throw한다", async () => {
    await expect(connector.executeWave([])).rejects.toThrow(
      "RemoteHarnessConnector.executeWave는 아직 구현되지 않았습니다"
    );
  });

  it("getStatus는 NotImplementedError를 throw한다", async () => {
    await expect(connector.getStatus()).rejects.toThrow(
      "RemoteHarnessConnector.getStatus는 아직 구현되지 않았습니다"
    );
  });

  it("onAgentComplete 콜백은 등록만 되고 즉시 실행되지 않는다", () => {
    let called = false;
    connector.onAgentComplete(() => {
      called = true;
    });
    expect(called).toBe(false);
  });

  it("onError 콜백은 등록만 되고 즉시 실행되지 않는다", () => {
    let called = false;
    connector.onError(() => {
      called = true;
    });
    expect(called).toBe(false);
  });
});

describe("createHarnessConnector — 팩토리 선택 로직", () => {
  it("localHarness도 remoteUrl도 없으면 Error", async () => {
    const { createHarnessConnector } = await import(
      "../connector/remote-harness-connector"
    );
    expect(() => createHarnessConnector()).toThrow(
      "LocalHarness 또는 Remote URL 중 하나는 반드시 제공해야 합니다"
    );
  });

  it("remoteUrl + apiKey 제공 시 RemoteHarnessConnector 반환", async () => {
    const { createHarnessConnector } = await import(
      "../connector/remote-harness-connector"
    );
    const connector = createHarnessConnector(
      undefined,
      "http://server",
      "key"
    );
    expect(connector).toBeInstanceOf(RemoteHarnessConnector);
  });
});
